const attendance = [
  {
    subject: "Computer Programming",
    schedule: "Mon / Wed, 8:00 AM",
    status: "Present",
  },
  {
    subject: "Database Systems",
    schedule: "Tue / Thu, 10:00 AM",
    status: "Present",
  },
  {
    subject: "Web Development",
    schedule: "Friday, 1:00 PM",
    status: "Absent",
  },
];

function StudentDashboard({ profile, onLogout }) {
  const studentName = profile?.first_name || "Student";
  const presentCount = attendance.filter(
    (item) => item.status === "Present",
  ).length;
  const absentCount = attendance.filter((item) => item.status === "Absent").length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white">
              SF
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Smart Fingerprint
              </p>
              <h1 className="text-lg font-bold">Student Dashboard</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Overview
          </p>
          <h2 className="mt-2 text-3xl font-bold">Welcome, {studentName}</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Classes Today</p>
            <p className="mt-3 text-3xl font-bold">{attendance.length}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Present</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {presentCount}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Absent</p>
            <p className="mt-3 text-3xl font-bold text-rose-600">
              {absentCount}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-bold">Attendance Record</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {attendance.map((item) => (
              <div
                key={`${item.subject}-${item.schedule}`}
                className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <h4 className="font-semibold text-slate-950">
                    {item.subject}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.schedule}
                  </p>
                </div>
                <span
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    item.status === "Present"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default StudentDashboard;
