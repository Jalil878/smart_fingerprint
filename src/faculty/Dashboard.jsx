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
    <main className="min-h-screen animate-fade-in bg-slate-100 pb-24 text-slate-900">
      <header className="animate-fade-in-up border-b border-slate-200 bg-white">
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
              <p className="animate-fade-in-up text-sm font-semibold uppercase tracking-wide text-slate-500">
                Overview
              </p>
              <h2 className="mt-2 animate-fade-in-up text-3xl font-bold" style={{ animationDelay: '0.1s' }}>
                Welcome, {facultyName}
              </h2>
            </div>

            <div className="animate-fade-in-up rounded-lg bg-white shadow-sm" style={{ animationDelay: '0.2s' }}>
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

              <div className="animate-stagger divide-y divide-slate-200">
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

      <nav className="animate-fade-in-up fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pb-3 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]" style={{ animationDelay: '0.3s' }}>
        <div className="mx-auto flex max-w-sm items-center justify-around">
          {[
            {
              key: "dashboard",
              label: "Dashboard",
              icon: (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9" />
                  <rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" />
                  <rect x="3" y="16" width="7" height="5" />
                </svg>
              ),
            },
            {
              key: "create attendance",
              label: "Create",
              icon: (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              ),
            },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActivePage(key)}
              className={`relative flex flex-col items-center gap-0.5 px-6 py-1 text-xs font-semibold transition ${
                activePage === key
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {activePage === key && (
                <span className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-slate-900" />
              )}
              {icon}
              {label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

export default FacultyDashboard;
