import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function ListStudent({ attendance, onBack, sessionStudents, onAddStudents, onRemoveStudent, isAllStudentsLoading, allStudentsError, addStudentsSearchTerm, setAddStudentsSearchTerm, selectedAddStudentIds, isAddingStudents, handleAddStudents, toggleAddStudent, filteredAddStudents, showAddStudents }) {
  const [localSessionStudents, setLocalSessionStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sessionDays, setSessionDays] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState({});
  const [sessionMeta, setSessionMeta] = useState(null);
  const [isStudentDetailLoading, setIsStudentDetailLoading] = useState(false);
  const [studentDetailError, setStudentDetailError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    if (sessionStudents !== undefined) {
      setLocalSessionStudents(sessionStudents);
    }
  }, [sessionStudents]);

  useEffect(() => {
    const loadSessionMeta = async () => {
      if (!attendance?.id) {
        setSessionMeta(null);
        return;
      }

      const { data } = await supabase
        .from("attendance_sessions")
        .select("course_code, semester, academic_year")
        .eq("id", attendance.id)
        .maybeSingle();

      setSessionMeta(data || null);
    };

    loadSessionMeta();
  }, [attendance?.id]);

  const students = localSessionStudents.length > 0 ? localSessionStudents : (sessionStudents || []);
  const resolvedCourseCode = sessionMeta?.course_code || attendance?.course_code;

  const fullName = (student) =>
    [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ");

  const hasFingerprint = (student) => Boolean(student.fingerprint_id);

  const idsMatch = (a, b) => {
    if (a === undefined || a === null || b === undefined || b === null) {
      return false;
    }

    const left = String(a).trim();
    const right = String(b).trim();

    return (
      left === right ||
      (left !== "" && right !== "" && Number(left) === Number(right))
    );
  };

  const normalizeEnrollmentStatus = (value) => {
    const v = String(value || "active").toLowerCase().trim();
    if (v === "warning") return "warning";
    if (v === "drop" || v === "dropped") return "drop";
    return "active";
  };

  const enrollmentStatusOptions = [
    { value: "active", label: "Active" },
    { value: "warning", label: "Warning" },
    { value: "drop", label: "Drop" },
  ];

  const enrollmentStatusStyle = (value) => {
    const n = normalizeEnrollmentStatus(value);
    if (n === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (n === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const openStudentDetail = async (student) => {
    setSelectedStudent(student);
    setStudentDetailError("");
    setIsStudentDetailLoading(true);

    // Use security-definer RPC so faculty can retrieve records without RLS blocking.
    // Previous code used supabase.from("attendance_records").select("*, students!inner(...)")
    // which is blocked by RLS and always returned 0 rows -> "No Record" for every day.
    let recordsData = null;
    let recordsError = null;
    let daysData = null;
    let daysError = null;

    const [recordsResult, daysResult] = await Promise.all([
      supabase.rpc("get_session_attendance_records", {
        p_session_id: attendance.id,
      }),
      supabase.rpc("get_session_days", {
        p_session_id: attendance.id,
      }),
    ]);

    recordsData = recordsResult.data;
    recordsError = recordsResult.error;
    daysData = daysResult.data;
    daysError = daysResult.error;

    // Fallback to direct query if RPC not yet deployed (e.g. DB migration not run)
    if (recordsError && recordsError.message?.includes("does not exist")) {
      const fallback = await supabase
        .from("attendance_records")
        .select("*, students!inner(first_name, middle_name, last_name, id_number, course)")
        .eq("attendance_session_id", attendance.id);
      recordsData = fallback.data;
      recordsError = fallback.error;
    }

    setIsStudentDetailLoading(false);

    if (daysError) {
      setStudentDetailError(daysError.message);
      return;
    }

    if (recordsError) {
      setStudentDetailError(recordsError.message);
      return;
    }

    const statusMap = {};
    (recordsData || []).forEach((record) => {
      // RPC returns flat student_id_number + joined student fields (id_number, first_name...)
      // Direct query returns nested record.students
      const linked = record.students || record;
      const recordStudentId = linked.id_number ?? record.student_id_number;
      const matched =
        idsMatch(recordStudentId, student.id_number) ||
        idsMatch(record.student_id_number, student.id_number) ||
        (linked.first_name === student.first_name &&
          linked.middle_name === student.middle_name &&
          linked.last_name === student.last_name);

      if (matched) {
        statusMap[record.day] = record.status;
      }
    });

    setSessionDays(daysData || []);
    setStudentStatuses(statusMap);
  };

  const closeStudentDetail = () => {
    setSelectedStudent(null);
    setSessionDays([]);
    setStudentStatuses({});
    setStudentDetailError("");
  };

  const handleEnrollmentStatusChange = async (student, newStatus) => {
    const normalized = normalizeEnrollmentStatus(newStatus);
    const studentIdNumber = Number(student.id_number);
    setStatusError("");
    setUpdatingStatusId(String(studentIdNumber));

    // Optimistic local update
    const prevStudents = localSessionStudents.length > 0 ? localSessionStudents : (sessionStudents || []);
    const updatedLocal = (prevStudents || []).map((s) =>
      String(s.id_number) === String(studentIdNumber) ? { ...s, status: normalized } : s
    );
    // keep localSessionStudents in sync even if it was empty
    setLocalSessionStudents(updatedLocal.length > 0 ? updatedLocal : prevStudents);
    if (selectedStudent && String(selectedStudent.id_number) === String(studentIdNumber)) {
      setSelectedStudent((prev) => ({ ...prev, status: normalized }));
    }

    // Try security-definer RPC first (bypasses RLS, works even if migration not yet applied)
    let rpcError = null;
    const { error: rpcErr } = await supabase.rpc("update_enrollment_status", {
      p_session_id: attendance.id,
      p_student_id_number: studentIdNumber,
      p_status: normalized,
    });
    rpcError = rpcErr;

    let directError = null;
    if (rpcError && rpcError.message?.includes("does not exist")) {
      // Fallback to direct update (requires RLS policy + column)
      const { error } = await supabase
        .from("attendance_session_students")
        .update({ status: normalized })
        .eq("attendance_session_id", attendance.id)
        .eq("student_id_number", studentIdNumber);
      directError = error;
      rpcError = directError;
    }

    setUpdatingStatusId(null);

    if (rpcError) {
      // rollback on error
      setLocalSessionStudents(prevStudents);
      if (selectedStudent && String(selectedStudent.id_number) === String(studentIdNumber)) {
        setSelectedStudent(student);
      }
      setStatusError(rpcError.message);
      return;
    }

    // success - also reflect in localSessionStudents if it was initially empty
    if (localSessionStudents.length === 0 && sessionStudents) {
      // force re-sync from optimistic array
      setLocalSessionStudents(updatedLocal);
    }
  };

  const isDetailOpen = !showAddStudents && Boolean(selectedStudent);

  const studentSummary = sessionDays.reduce(
    (totals, item) => {
      const status = studentStatuses[item.day];
      if (status === "present") totals.present += 1;
      else if (status === "late") totals.late += 1;
      else if (status === "absent") totals.absent += 1;
      else totals.noRecord += 1;
      return totals;
    },
    { present: 0, late: 0, absent: 0, noRecord: 0 },
  );

  const renderStatusBadge = (status) => {
    if (!status) {
      return (
        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          No Record
        </span>
      );
    }

    const styles =
      status === "present"
        ? "bg-emerald-50 text-emerald-700"
        : status === "late"
          ? "bg-amber-50 text-amber-700"
          : "bg-rose-50 text-rose-700";

    return (
      <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button
          type="button"
          onClick={isDetailOpen ? closeStudentDetail : onBack}
          className="group mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <svg className="h-4 w-4 transition group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Students
        </p>
        <h2 className="mt-2 text-3xl font-bold">
          {resolvedCourseCode
            ? `${resolvedCourseCode} - ${attendance?.subject_name}`
            : attendance?.subject_name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Section {attendance?.section}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold">
            {isDetailOpen
              ? fullName(selectedStudent)
              : showAddStudents
                ? "Add Students"
                : "Enrolled Students"}
          </h3>
          {isDetailOpen ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Status</label>
              <select
                value={normalizeEnrollmentStatus(selectedStudent?.status)}
                onChange={(e) => handleEnrollmentStatusChange(selectedStudent, e.target.value)}
                disabled={String(updatingStatusId) === String(selectedStudent?.id_number)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold capitalize outline-none focus:ring-2 focus:ring-slate-200 ${enrollmentStatusStyle(selectedStudent?.status)}`}
              >
                {enrollmentStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : !showAddStudents ? (
            <button
              type="button"
              onClick={onAddStudents}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Students
            </button>
          ) : null}
        </div>
        {statusError && !showAddStudents && (
          <p className="border-b border-slate-200 bg-rose-50 px-5 py-2 text-xs font-semibold text-rose-700">
            {statusError}
          </p>
        )}

        {showAddStudents ? (
          <>
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={onRemoveStudent}
                  className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  <svg className="h-4 w-4 transition group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>
                <p className="mt-1 text-sm text-slate-500">
                  Choose students to add to this attendance session.
                </p>
              </div>
            </div>

            <div className="border-b border-slate-200 px-6 py-4">
              <input
                type="search"
                value={addStudentsSearchTerm}
                onChange={(event) => setAddStudentsSearchTerm(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="Search student name, ID, or course"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
              {isAllStudentsLoading && (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  Loading students...
                </p>
              )}

              {allStudentsError && (
                <p className="rounded-lg bg-rose-50 px-4 py-5 text-sm font-medium text-rose-700">
                  {allStudentsError}
                </p>
              )}

              {!isAllStudentsLoading &&
                !allStudentsError &&
                filteredAddStudents.length === 0 && (
                  <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                    No students found.
                  </p>
                )}

              <div className="space-y-2">
                {filteredAddStudents.map((student) => {
                  const isSelected = selectedAddStudentIds.includes(
                    student.id_number,
                  );

                  return (
                    <label
                      key={student.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAddStudent(student.id_number)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <p className="font-semibold text-slate-950">
                          {fullName(student)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {student.id_number} - {student.course}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <p className="text-sm font-medium text-slate-500">
                {selectedAddStudentIds.length} selected
              </p>
              <button
                type="button"
                onClick={handleAddStudents}
                disabled={isAddingStudents}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAddingStudents ? "Adding..." : "Add Students"}
              </button>
            </div>
          </>
        ) : isDetailOpen ? (
          <>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 px-6 py-4 md:gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Present</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">{studentSummary.present}</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Late</p>
                <p className="mt-1 text-xl font-bold text-amber-600">{studentSummary.late}</p>
              </div>
              <div className="rounded-lg bg-rose-50 px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Absent</p>
                <p className="mt-1 text-xl font-bold text-rose-600">{studentSummary.absent}</p>
              </div>
            </div>

            {isStudentDetailLoading && (
              <p className="px-6 py-6 text-sm font-medium text-slate-500">
                Loading attendance...
              </p>
            )}

            {studentDetailError && (
              <p className="px-6 py-6 text-sm font-medium text-rose-700">
                {studentDetailError}
              </p>
            )}

            {!isStudentDetailLoading && !studentDetailError && sessionDays.length === 0 && (
              <p className="px-6 py-6 text-sm font-medium text-slate-500">
                No attendance days yet for this subject.
              </p>
            )}

            {!isStudentDetailLoading && !studentDetailError && sessionDays.length > 0 && (
              <ul className="divide-y divide-slate-200">
                {sessionDays.map((item) => (
                  <li key={item.day} className="flex items-center justify-between gap-4 px-6 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-950">Day {item.day}</p>
                      {item.created_at && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {new Date(item.created_at).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                    {renderStatusBadge(studentStatuses[item.day])}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="px-5 py-4">
              <p className="mt-1 text-sm text-slate-500">
                {students.length} student
                {students.length !== 1 ? "s" : ""} enrolled
              </p>
            </div>

            {students.length === 0 ? (
              <p className="px-5 py-6 text-sm font-medium text-slate-500">
                No students enrolled in this session.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Student Name</th>
                      <th className="px-6 py-3 font-semibold">Course</th>
                      <th className="px-6 py-3 font-semibold">ID Number</th>
                      <th className="px-6 py-3 font-semibold">Fingerprint</th>
                      <th className="px-6 py-3 font-semibold select-text cursor-pointer">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {students.map((student) => (
                      <tr
                        key={student.id_number}
                        onClick={() => openStudentDetail(student)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-3.5 font-semibold text-slate-950">
                          {fullName(student)}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {student.course || "\u2014"}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">
                          {student.id_number}
                        </td>
                        <td className="px-6 py-3.5">
                          {hasFingerprint(student) ? (
                            <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Enrolled
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                              Not Enrolled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${enrollmentStatusStyle(student.status)}`}
                          >
                            {enrollmentStatusOptions.find((o) => o.value === normalizeEnrollmentStatus(student.status))?.label || normalizeEnrollmentStatus(student.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ListStudent;
