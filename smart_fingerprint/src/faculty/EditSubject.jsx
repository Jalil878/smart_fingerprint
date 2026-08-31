function EditSubject({
  attendance,
  onBack,
  editSubjectData,
  setEditSubjectData,
  editSubjectError,
  isSavingEditSubject,
  handleEditSubject,
}) {
  return (
    <div>
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="group mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <svg
            className="h-4 w-4 transition group-hover:-translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Attendance details
        </p>
        <h2 className="mt-2 text-3xl font-bold">Edit Subject</h2>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleEditSubject();
        }}
        noValidate
        className="grid gap-5 rounded-lg bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Subject name
          </label>
          <input
            type="text"
            value={editSubjectData.subject_name}
            onChange={(event) =>
              setEditSubjectData((current) => ({
                ...current,
                subject_name: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter subject name"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Section
          </label>
          <input
            type="text"
            value={editSubjectData.section}
            onChange={(event) =>
              setEditSubjectData((current) => ({
                ...current,
                section: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter section"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Course code
          </label>
          <input
            type="text"
            value={editSubjectData.course_code}
            onChange={(event) =>
              setEditSubjectData((current) => ({
                ...current,
                course_code: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter course code"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Semester
          </label>
          <select
            value={editSubjectData.semester}
            onChange={(event) =>
              setEditSubjectData((current) => ({
                ...current,
                semester: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
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
              type="number"
              min="2000"
              max="2100"
              value={editSubjectData.start_academic_year}
              onChange={(event) =>
                setEditSubjectData((current) => ({
                  ...current,
                  start_academic_year: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              placeholder="Start year"
            />
            <input
              type="number"
              min="2000"
              max="2101"
              value={editSubjectData.end_academic_year}
              onChange={(event) =>
                setEditSubjectData((current) => ({
                  ...current,
                  end_academic_year: event.target.value,
                }))
              }
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
            type="time"
            value={editSubjectData.attendance_time}
            onChange={(event) =>
              setEditSubjectData((current) => ({
                ...current,
                attendance_time: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Room
          </label>
          <input
            type="text"
            value={editSubjectData.room}
            onChange={(event) =>
              setEditSubjectData((current) => ({
                ...current,
                room: event.target.value,
              }))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            placeholder="Enter room"
          />
        </div>

        {editSubjectError && (
          <p className="md:col-span-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {editSubjectError}
          </p>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSavingEditSubject}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingEditSubject ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditSubject;
