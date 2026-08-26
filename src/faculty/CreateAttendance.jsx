import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

function CreateAttendance({ onGoToDashboard, onSaved }) {
  const formRef = useRef(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentIdNumbers, setSelectedStudentIdNumbers] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [pendingAttendance, setPendingAttendance] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastCreatedAttendance, setLastCreatedAttendance] = useState(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      setErrorMessage("");
      setIsLoadingStudents(true);

      const { data, error } = await supabase
        .from("students")
        .select("id, first_name, middle_name, last_name, id_number, course")
        .order("last_name", { ascending: true });

      setIsLoadingStudents(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setStudents(data || []);
    };

    loadStudents();
  }, []);

  const normalizedSearchTerm = studentSearchTerm.trim().toLowerCase();
  const filteredStudents = normalizedSearchTerm
    ? students.filter((student) => {
        const fullName = [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(" ");
        const searchableText = [fullName, student.id_number, student.course]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
    : students;

  const toggleStudent = (studentIdNumber) => {
    setSelectedStudentIdNumbers((currentIdNumbers) =>
      currentIdNumbers.includes(studentIdNumber)
        ? currentIdNumbers.filter((idNumber) => idNumber !== studentIdNumber)
        : [...currentIdNumbers, studentIdNumber],
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLastCreatedAttendance(null);
    setPendingAttendance(null);

    const formData = new FormData(event.currentTarget);
    const subjectName = formData.get("subjectName")?.trim();
    const courseCode = formData.get("courseCode")?.trim();
    const section = formData.get("section")?.trim();
    const semester = formData.get("semester")?.trim();
    const startAcademicYear = formData.get("startAcademicYear")?.trim();
    const endAcademicYear = formData.get("endAcademicYear")?.trim();
    const attendanceTime = formData.get("attendanceTime");
    const room = formData.get("room")?.trim();

    if (!subjectName) {
      setErrorMessage("Please enter the subject name.");
      return;
    }

    if (!section) {
      setErrorMessage("Please enter the section.");
      return;
    }

    if (!semester) {
      setErrorMessage("Please enter the semester.");
      return;
    }

    if (!startAcademicYear) {
      setErrorMessage("Please enter the start year.");
      return;
    }

    if (!endAcademicYear) {
      setErrorMessage("Please enter the end year.");
      return;
    }

    if (Number(endAcademicYear) <= Number(startAcademicYear)) {
      setErrorMessage("End year must be greater than start year.");
      return;
    }

    if (!attendanceTime) {
      setErrorMessage("Please select the attendance time.");
      return;
    }

    if (selectedStudentIdNumbers.length === 0) {
      setErrorMessage("Please select at least one student.");
      return;
    }

    setPendingAttendance({
      subjectName,
      courseCode,
      section,
      semester,
      academicYear: `${startAcademicYear}-${endAcademicYear}`,
      startAcademicYear,
      endAcademicYear,
      attendanceTime,
      room,
      studentIdNumbers: [...selectedStudentIdNumbers],
    });
  };

  const handleCancelSave = () => {
    setPendingAttendance(null);
  };

  const handleConfirmSave = async () => {
    if (!pendingAttendance) {
      return;
    }

    setIsSaving(true);

    const { data: attendanceId, error: saveError } = await supabase.rpc(
      "create_attendance",
      {
        p_subject_name: pendingAttendance.subjectName,
        p_section: pendingAttendance.section,
        p_course_code: pendingAttendance.courseCode || null,
        p_semester: pendingAttendance.semester,
        p_academic_year: pendingAttendance.academicYear,
        p_attendance_time: pendingAttendance.attendanceTime,
        p_room: pendingAttendance.room || null,
        p_student_id_numbers: pendingAttendance.studentIdNumbers,
      },
    );

    setIsSaving(false);

    if (saveError) {
      setErrorMessage(saveError.message);
      return;
    }

    formRef.current?.reset();
    setLastCreatedAttendance({
      id: attendanceId,
      subjectName: pendingAttendance.subjectName,
      courseCode: pendingAttendance.courseCode,
      section: pendingAttendance.section,
      semester: pendingAttendance.semester,
      academicYear: pendingAttendance.academicYear,
      startAcademicYear: pendingAttendance.startAcademicYear,
      endAcademicYear: pendingAttendance.endAcademicYear,
      attendanceTime: pendingAttendance.attendanceTime,
      room: pendingAttendance.room,
      studentCount: pendingAttendance.studentIdNumbers.length,
    });
    setSelectedStudentIdNumbers([]);
    setPendingAttendance(null);
    setSuccessMessage("Attendance saved successfully.");
    onSaved?.({
      id: attendanceId,
      subject_name: pendingAttendance.subjectName,
      course_code: pendingAttendance.courseCode,
      section: pendingAttendance.section,
      semester: pendingAttendance.semester,
      academic_year: pendingAttendance.academicYear,
      attendance_time: pendingAttendance.attendanceTime,
      room: pendingAttendance.room,
      created_at: new Date().toISOString(),
      total_students: pendingAttendance.studentIdNumbers.length,
    });
    onGoToDashboard?.();
  };

  return (
    <div>
      {successMessage && (
        <div className="fixed left-1/2 top-4 z-60 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-600 px-5 py-4 text-center text-sm font-bold text-white shadow-2xl">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="fixed left-1/2 top-4 z-60 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-rose-300 bg-rose-600 px-5 py-4 text-center text-sm font-bold text-white shadow-2xl">
          {errorMessage}
        </div>
      )}

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Attendance setup
        </p>
        <h2 className="mt-2 text-3xl font-bold">Create Attendance</h2>
      </div>

      {lastCreatedAttendance && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Saved
          </p>
          <h3 className="mt-1 text-xl font-bold text-emerald-950">
            Attendance created successfully
          </h3>
          <div className="mt-4 grid gap-3 text-sm text-emerald-900 md:grid-cols-2">
            <p>
              <span className="font-semibold">Subject:</span>{" "}
              {lastCreatedAttendance.subjectName}
            </p>
            <p>
              <span className="font-semibold">Section:</span>{" "}
              {lastCreatedAttendance.section}
            </p>
            {lastCreatedAttendance.courseCode && (
              <p>
                <span className="font-semibold">Course code:</span>{" "}
                {lastCreatedAttendance.courseCode}
              </p>
            )}
            <p>
              <span className="font-semibold">Semester:</span>{" "}
              {lastCreatedAttendance.semester}
            </p>
            <p>
              <span className="font-semibold">Academic year:</span>{" "}
              {lastCreatedAttendance.academicYear}
            </p>
            <p>
              <span className="font-semibold">Time:</span>{" "}
              {lastCreatedAttendance.attendanceTime}
            </p>
            <p>
              <span className="font-semibold">Students:</span>{" "}
              {lastCreatedAttendance.studentCount}
            </p>
            {lastCreatedAttendance.room && (
              <p>
                <span className="font-semibold">Room:</span>{" "}
                {lastCreatedAttendance.room}
              </p>
            )}
            <p className="break-all md:col-span-2">
              <span className="font-semibold">Attendance ID:</span>{" "}
              {lastCreatedAttendance.id}
            </p>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-5 rounded-lg bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Subject name
          </label>
          <input
            name="subjectName"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter subject name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Section
          </label>
          <input
            name="section"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter section"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Course code
          </label>
          <input
            name="courseCode"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter course code"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Semester
          </label>
          <select
            name="semester"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            defaultValue=""
          >
            <option value="" disabled>
              Select semester
            </option>
            <option value="1st Semester">1st Semester</option>
            <option value="2nd Semester">2nd Semester</option>
            <option value="3rd Semester">3rd Semester</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Academic year
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="startAcademicYear"
              type="number"
              min="2000"
              max="2100"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="Start year"
            />
            <input
              name="endAcademicYear"
              type="number"
              min="2000"
              max="2101"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="End year"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Time
          </label>
          <input
            name="attendanceTime"
            type="time"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Room
          </label>
          <input
            name="room"
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter room"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Students
          </label>
          <button
            type="button"
            onClick={() => setIsStudentModalOpen(true)}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Select Student
          </button>
          <p className="mt-2 text-sm text-slate-500">
            {selectedStudentIdNumbers.length} student
            {selectedStudentIdNumbers.length === 1 ? "" : "s"} selected
          </p>
        </div>

        {errorMessage && (
          <p className="md:col-span-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="md:col-span-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
            {successMessage}
          </p>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      {pendingAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-save-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confirm attendance
              </p>
              <h3
                id="confirm-save-title"
                className="mt-1 text-xl font-bold text-slate-950"
              >
                Save this attendance?
              </h3>
            </div>

            <div className="space-y-3 px-6 py-5 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Subject:</span>{" "}
                {pendingAttendance.subjectName}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Section:</span>{" "}
                {pendingAttendance.section}
              </p>
              {pendingAttendance.courseCode && (
                <p>
                  <span className="font-semibold text-slate-900">
                    Course code:
                  </span>{" "}
                  {pendingAttendance.courseCode}
                </p>
              )}
              <p>
                <span className="font-semibold text-slate-900">Semester:</span>{" "}
                {pendingAttendance.semester}
              </p>
              <p>
                <span className="font-semibold text-slate-900">
                  Academic year:
                </span>{" "}
                {pendingAttendance.academicYear}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Time:</span>{" "}
                {pendingAttendance.attendanceTime}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Students:</span>{" "}
                {pendingAttendance.studentIdNumbers.length}
              </p>
              {pendingAttendance.room && (
                <p>
                  <span className="font-semibold text-slate-900">Room:</span>{" "}
                  {pendingAttendance.room}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={handleCancelSave}
                disabled={isSaving}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStudentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="select-students-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attendance students
                </p>
                <h3
                  id="select-students-title"
                  className="mt-1 text-xl font-bold text-slate-950"
                >
                  Select Student
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Choose students who will be included in this attendance.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close select student modal"
              >
                X
              </button>
            </div>

            <div className="border-b border-slate-200 px-6 py-4">
              <input
                type="search"
                value={studentSearchTerm}
                onChange={(event) => setStudentSearchTerm(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="Search student name, ID, or course"
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
              {isLoadingStudents && (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  Loading students...
                </p>
              )}

              {!isLoadingStudents && filteredStudents.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  No students found.
                </p>
              )}

              <div className="space-y-2">
                {filteredStudents.map((student) => {
                  const fullName = [
                    student.first_name,
                    student.middle_name,
                    student.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const isSelected = selectedStudentIdNumbers.includes(
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
                        onChange={() => toggleStudent(student.id_number)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <p className="font-semibold text-slate-950">
                          {fullName}
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
                {selectedStudentIdNumbers.length} selected
              </p>
              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateAttendance;
