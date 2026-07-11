import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function ManageStudent() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      setErrorMessage("");
      setIsLoading(true);

      const { data, error } = await supabase
        .from("students")
        .select(
          "id, first_name, middle_name, last_name, id_number, course, email, created_at",
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

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const updatedStudent = {
      first_name: formData.get("firstName"),
      middle_name: formData.get("middleName"),
      last_name: formData.get("lastName"),
      id_number: formData.get("idNumber"),
      course: formData.get("course"),
      email: formData.get("email"),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("students")
      .update(updatedStudent)
      .eq("id", editingStudent.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.map((student) =>
        student.id === editingStudent.id
          ? { ...student, ...updatedStudent }
          : student,
      ),
    );
    setEditingStudent(null);
  };

  const deleteStudent = async (student) => {
    const fullName = [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    if (!window.confirm(`Delete ${fullName} from approved students?`)) {
      return;
    }

    setErrorMessage("");

    const { error: deleteError } = await supabase.rpc("delete_app_user", {
      target_user_id: student.id,
    });

    if (deleteError) {
      setErrorMessage(deleteError.message);
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.filter(
        (currentStudent) => currentStudent.id !== student.id,
      ),
    );
  };

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Management
      </p>
      <h2 className="mt-2 text-3xl font-bold">Manage Student</h2>

      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Approved Students
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              List of student accounts approved for the system.
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
                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Approved
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(student)}
                          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteStudent(student)}
                          className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            Loading approved students...
          </p>
        )}

        {!isLoading && students.length === 0 && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            No approved students yet.
          </p>
        )}

        {!isLoading && students.length > 0 && filteredStudents.length === 0 && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            No approved students match your search.
          </p>
        )}

        {errorMessage && (
          <p className="px-5 py-4 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        )}
      </div>

      {editingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-title"
        >
          <form
            onSubmit={handleEditSubmit}
            className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 id="edit-student-title" className="text-xl font-bold">
                Edit Student
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Update approved student account details.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  First name
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  defaultValue={editingStudent.first_name}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Middle name
                </label>
                <input
                  name="middleName"
                  type="text"
                  defaultValue={editingStudent.middle_name || ""}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Last name
                </label>
                <input
                  name="lastName"
                  type="text"
                  required
                  defaultValue={editingStudent.last_name}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  ID Number
                </label>
                <input
                  name="idNumber"
                  type="text"
                  required
                  defaultValue={editingStudent.id_number}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Course
                </label>
                <input
                  name="course"
                  type="text"
                  required
                  defaultValue={editingStudent.course}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={editingStudent.email}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default ManageStudent;
