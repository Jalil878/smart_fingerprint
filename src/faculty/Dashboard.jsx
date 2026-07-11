import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CreateAttendance from "./CreateAttendance";

function FacultyDashboard({ profile, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const loadAttendanceSessions = async () => {
      setAttendanceError("");
      setIsLoadingAttendance(true);

      const { data, error } = await supabase.rpc(
        "get_my_attendance_sessions",
      );

      setIsLoadingAttendance(false);

      if (error) {
        setAttendanceError(error.message);
        return;
      }

      setAttendanceSessions(data || []);
    };

    loadAttendanceSessions();
  }, [refreshCount]);

  const handleAttendanceSaved = (createdAttendance) => {
    if (createdAttendance) {
      setAttendanceSessions((currentSessions) => [
        createdAttendance,
        ...currentSessions,
      ]);
    }

    setRefreshCount((currentCount) => currentCount + 1);
    setActivePage("dashboard");
  };

  const handleGoToDashboard = () => {
    setActivePage("dashboard");
  };
  const facultyName =
    [profile?.first_name, profile?.middle_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") || "Faculty";

  return (
    <main className="min-h-screen bg-slate-100 pb-24 text-slate-900">
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
              <h1 className="text-lg font-bold">Faculty Dashboard</h1>
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
        {activePage === "dashboard" && (
          <>
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Overview
              </p>
              <h2 className="mt-2 text-3xl font-bold">
                Welcome, {facultyName}
              </h2>
            </div>

            <div className="rounded-lg bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold">My Classes</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Created attendance sessions will appear here.
                </p>
              </div>

              {isLoadingAttendance && (
                <p className="px-5 py-6 text-sm font-medium text-slate-500">
                  Loading created attendance...
                </p>
              )}

              {!isLoadingAttendance && attendanceSessions.length === 0 && (
                <p className="px-5 py-6 text-sm font-medium text-slate-500">
                  No created attendance yet.
                </p>
              )}

              {attendanceError && (
                <p className="px-5 py-4 text-sm font-medium text-rose-700">
                  {attendanceError}
                </p>
              )}

              <div className="divide-y divide-slate-200">
                {attendanceSessions.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-950">
                        {item.subject_name}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.section} - {item.attendance_time}
                        {item.room ? ` - ${item.room}` : ""}
                      </p>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      Created
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activePage === "create attendance" && (
          <CreateAttendance
            onGoToDashboard={handleGoToDashboard}
            onSaved={handleAttendanceSaved}
          />
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {["dashboard", "create attendance"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActivePage(item)}
              className={`rounded-lg px-4 py-3 text-sm font-bold capitalize transition ${
                activePage === item
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

export default FacultyDashboard;
