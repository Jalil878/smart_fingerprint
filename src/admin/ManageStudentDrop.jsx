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
        .from("students")
        .select(
          "id, first_name, middle_name, last_name, id_number, course, email, status, created_at",
        )
        .order("created_at", { ascending: false });

      setIsLoading(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setStudents(data || []);
    };

    loadStudents();
  }, []);

  const toggleDrop = async (student) => {
    const nextStatus =
      student.status === "dropped" ? "active" : "dropped";
    const actionLabel = nextStatus === "dropped" ? "Drop" : "Restore";
    const fullName = [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    if (!window.confirm(`${actionLabel} ${fullName}?`)) {
      return;
    }

    setErrorMessage("");
    setBusyId(student.id);

    const { error } = await supabase
      .from("students")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", student.id);

    setBusyId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.map((currentStudent) =>
        currentStudent.id === student.id
          ? { ...currentStudent, status: nextStatus }
          : currentStudent,
      ),
    );
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredStudents = normalizedSearchTerm
    ? students.filter((student) => {
        const searchableText = [
          student.first_name,
          student.middle_name,
          student.last_name,
          student.id_number,
          student.course,
          student.email,
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
            <h3 className="text-lg font-bold text-slate-950">Students</h3>
            <p className="mt-1 text-sm text-slate-500">
              Mark students as dropped out or restore them to active.
            </p>
          </div>

          <label className="relative block w-full sm:max-w-xs">
            <span className="sr-only">Search students</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              type="search"
              placeholder="Search students"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">ID Number</th>
                <th className="px-5 py-3 font-semibold">Course</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((student) => {
                const fullName = [
                  student.first_name,
                  student.middle_name,
                  student.last_name,
                ]
                  .filter(Boolean)
                  .join(" ");
                const isDropped = student.status === "dropped";

                return (
                  <tr key={student.id}>
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {fullName}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.id_number}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.course}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {student.email}
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
            No students yet.
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
