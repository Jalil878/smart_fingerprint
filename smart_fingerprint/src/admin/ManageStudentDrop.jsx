import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function ManageStudentDrop() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const loadStudents = async () => {
      setErrorMessage("");
      setIsLoading(true);

      const { data, error } = await supabase
        .from("attendance_session_students")
        .select(
          "id, attendance_session_id, student_id_number, status, students!inner(id_number, first_name, middle_name, last_name, course, email), attendance_sessions!inner(subject_name, section, course_code, semester, academic_year)",
        )
        .in("status", ["drop", "dropped"])
        .order("created_at", { ascending: false });

      setIsLoading(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setStudents(
        (data || []).map((item) => {
          const studentData = Array.isArray(item.students)
            ? item.students[0]
            : item.students;
          const sessionData = Array.isArray(item.attendance_sessions)
            ? item.attendance_sessions[0]
            : item.attendance_sessions;

          return {
            id: item.id,
            status: item.status,
            attendance_session_id: item.attendance_session_id,
            student_id_number: item.student_id_number,
            student: studentData,
            session: sessionData,
          };
        }),
      );
    };

    loadStudents();
  }, []);

  const toggleDrop = async (student) => {
    const nextStatus = "active";
    const actionLabel = "Restore";
    const fullName = [
      student.student?.first_name,
      student.student?.middle_name,
      student.student?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    if (!window.confirm(`${actionLabel} ${fullName}?`)) {
      return;
    }

    setErrorMessage("");
    setBusyId(student.id);

    const studentIdNumber = Number(
      student.student?.id_number || student.student_id_number,
    );

    let restoreError = null;
    let restoreSucceeded = false;
    let usedDirectFallback = false;
    const { data: restoreRpcData, error: restoreRpcError } = await supabase.rpc(
      "restore_dropped_student_by_admin",
      {
        p_session_id: student.attendance_session_id,
        p_student_id_number: studentIdNumber,
      },
    );
    restoreError = restoreRpcError;
    restoreSucceeded = restoreRpcData === true;

    const shouldFallbackDirectUpdate =
      restoreError &&
      (restoreError.message?.includes("does not exist") ||
        restoreError.message?.includes("Could not find the function") ||
        restoreError.message?.includes("schema cache"));

    if (shouldFallbackDirectUpdate) {
      usedDirectFallback = true;
      const { error: directUpdateError } = await supabase
        .from("attendance_session_students")
        .update({ status: nextStatus })
        .eq("id", student.id)
        .in("status", ["drop", "dropped"]);

      restoreError = directUpdateError;

      if (!directUpdateError) {
        const { data: stillDroppedRows, error: recheckError } = await supabase
          .from("attendance_session_students")
          .select("id")
          .eq("id", student.id)
          .in("status", ["drop", "dropped"])
          .limit(1);

        if (recheckError) {
          restoreError = recheckError;
        } else {
          restoreSucceeded = (stillDroppedRows || []).length === 0;
        }
      }
    }

    setBusyId(null);

    if (restoreError) {
      setErrorMessage(restoreError.message);
      return;
    }

    if (!restoreSucceeded) {
      setErrorMessage(
        usedDirectFallback
          ? "Restore failed. Admin restore function is missing or unavailable. Run DatabaseScript/restore-dropped-student-by-admin.sql in Supabase SQL Editor."
          : "Restore failed. No dropped status record was updated for this student.",
      );
      return;
    }

    const sessionLabel = student.session?.course_code
      ? `${student.session.course_code} - ${student.session.subject_name}`
      : student.session?.subject_name || "this class";
    const notificationPayload = {
      student_id_number: studentIdNumber,
      title: "Enrollment Status Restored",
      message: `Your enrollment status for ${sessionLabel} has been restored to Active by admin.`,
    };

    let notificationError = null;
    const { error: notifyRpcError } = await supabase.rpc(
      "notify_status_restored_by_admin",
      {
        p_student_id_number: notificationPayload.student_id_number,
        p_title: notificationPayload.title,
        p_message: notificationPayload.message,
      },
    );
    notificationError = notifyRpcError;

    const shouldFallbackNotificationInsert =
      notificationError &&
      (notificationError.message?.includes("does not exist") ||
        notificationError.message?.includes("Could not find the function") ||
        notificationError.message?.includes("schema cache"));

    if (shouldFallbackNotificationInsert) {
      const { error: notifyInsertError } = await supabase
        .from("notifications")
        .insert(notificationPayload);
      notificationError = notifyInsertError;
    }

    setStudents((currentStudents) =>
      currentStudents.filter((currentStudent) => currentStudent.id !== student.id),
    );

    if (notificationError) {
      setErrorMessage(
        `Status restored, but student notification was not sent: ${notificationError.message}`,
      );
    }
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredStudents = normalizedSearchTerm
    ? students.filter((student) => {
        const searchableText = [
          student.student?.first_name,
          student.student?.middle_name,
          student.student?.last_name,
          student.student?.id_number,
          student.student_id_number,
          student.student?.course,
          student.student?.email,
          student.session?.course_code,
          student.session?.subject_name,
          student.session?.section,
          student.session?.academic_year,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
    : students;

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Management
      </p>
      <h2 className="mt-2 text-3xl font-bold">Manage Student Drop</h2>

      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Dropped Students</h3>
            <p className="mt-1 text-sm text-slate-500">
              View all dropped students and restore them to active.
            </p>
          </div>

          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search students</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              type="search"
              placeholder="Search students or ID number"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">ID Number</th>
                <th className="px-5 py-3 font-semibold">Course</th>
                <th className="px-5 py-3 font-semibold">Session</th>
                <th className="px-5 py-3 font-semibold">Semester</th>
                <th className="px-5 py-3 font-semibold">Academic Year</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => {
                const fullName = [
                  student.student?.first_name,
                  student.student?.middle_name,
                  student.student?.last_name,
                ]
                  .filter(Boolean)
                  .join(" ");
                const normalizedStatus = String(student.status || "").toLowerCase();
                const isDropped =
                  normalizedStatus === "drop" || normalizedStatus === "dropped";
                const sessionLabel = student.session?.course_code
                  ? `${student.session.course_code} - ${student.session.subject_name}`
                  : student.session?.subject_name || "N/A";

                return (
                  <tr key={student.id}>
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {fullName}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.student?.id_number || student.student_id_number}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.student?.course || "N/A"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {sessionLabel}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.session?.semester || "N/A"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.session?.academic_year || "N/A"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                          isDropped
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isDropped ? "Dropped" : "Active"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => toggleDrop(student)}
                        disabled={busyId === student.id}
                        className={`rounded-md px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isDropped
                            ? "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        {busyId === student.id
                          ? "Saving..."
                          : isDropped
                            ? "Restore"
                            : "Drop"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            Loading students...
          </p>
        )}

        {!isLoading && students.length === 0 && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            No dropped students yet.
          </p>
        )}

        {!isLoading &&
          students.length > 0 &&
          filteredStudents.length === 0 && (
            <p className="px-5 py-6 text-sm font-medium text-slate-500">
              No students match your search.
            </p>
          )}

        {errorMessage && (
          <p className="px-5 py-4 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}

export default ManageStudentDrop;
