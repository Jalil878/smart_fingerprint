import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import MyProfile from "./MyProfile";
import Notifications from "./Notifications";
import DayAttendanceStudents from "./DayAttendanceStudents";

function StudentDashboard({ profile, onLogout, onProfileUpdate }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState("");
  const studentName = profile?.first_name || "Student";

  useEffect(() => {
    const loadClasses = async () => {
      setClassesError("");
      setIsLoadingClasses(true);

      const { data, error } = await supabase.rpc("get_my_classes");

      setIsLoadingClasses(false);

      if (error) {
        setClassesError(error.message);
        return;
      }

      setClasses(data || []);
    };

    loadClasses();
  }, []);

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const navItems = [
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
      key: "notifications",
      label: "Notification",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      key: "profile",
      label: "My Profile",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-screen animate-fade-in bg-slate-100 text-slate-900">
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

      <section className="mx-auto max-w-6xl px-5 py-8 pb-28">
        {activePage === "dashboard" && (
          <>
            <div className="mb-8">
              <p className="animate-fade-in-up text-sm font-semibold uppercase tracking-wide text-slate-500">
                Overview
              </p>
              <h2 className="mt-2 animate-fade-in-up text-3xl font-bold" style={{ animationDelay: '0.1s' }}>Welcome, {studentName}</h2>
            </div>

            <div className="mt-8 animate-fade-in-up rounded-lg bg-white shadow-sm" style={{ animationDelay: '0.3s' }}>
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-bold">My Classes</h3>
              </div>
              <div className="animate-stagger divide-y divide-slate-200">
                {isLoadingClasses && (
                  <p className="px-5 py-6 text-sm text-slate-500">Loading classes...</p>
                )}
                {!isLoadingClasses && classesError && (
                  <p className="rounded-md bg-rose-50 m-4 px-3 py-2 text-sm font-medium text-rose-700">
                    {classesError}
                  </p>
                )}
                {!isLoadingClasses && !classesError && classes.length === 0 && (
                  <p className="px-5 py-6 text-sm text-slate-500">
                    You are not enrolled in any classes yet.
                  </p>
                )}
                {classes.map((item) => (
                  <button
                    key={item.id || `${item.subject_name}-${item.section}-${item.attendance_time}`}
                    type="button"
                    onClick={() => {
                      setSelectedClass(item);
                      setActivePage("day attendance");
                    }}
                    className="grid w-full gap-4 px-5 py-4 text-left ring-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-950">
                        {item.subject_name}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.section} &middot; {formatTime(item.attendance_time)}
                      </p>
                      {item.room && (
                        <p className="mt-0.5 text-sm text-slate-400">
                          Room: {item.room}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activePage === "notifications" && <Notifications />}

        {activePage === "day attendance" && selectedClass && (
          <DayAttendanceStudents
            classItem={selectedClass}
            onBack={() => setActivePage("dashboard")}
          />
        )}

        {activePage === "profile" && (
          <MyProfile profile={profile} onProfileUpdate={onProfileUpdate} />
        )}
      </section>

      <nav className="animate-fade-in-up fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pb-3 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]" style={{ animationDelay: '0.3s' }}>
        <div className="mx-auto flex max-w-sm items-center justify-around">
          {navItems.map(({ key, label, icon }) => (
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

export default StudentDashboard;
