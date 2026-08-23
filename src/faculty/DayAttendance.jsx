import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function DayAttendance({ attendance, onBack, dayRefreshKey, onSelectDay }) {
  const [dayTotals, setDayTotals] = useState([]);
  const [days, setDays] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState("");
  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  useEffect(() => {
    const loadAll = async () => {
      setError("");
      setIsLoading(true);

      const [{ data: daysData }, { data: countData }, { data: totalsData }] =
        await Promise.all([
          supabase.rpc("get_session_days", { p_session_id: attendance.id }),
          supabase.rpc("count_session_students", { p_session_id: attendance.id }),
          supabase.rpc("get_session_day_totals", { p_session_id: attendance.id }),
        ]);

      if (daysData) setDays(daysData || []);
      if (countData !== null) setTotalStudents(countData);
      if (totalsData) setDayTotals(totalsData || []);

      setIsLoading(false);
    };

    loadAll();
  }, [attendance.id, dayRefreshKey]);

  const dayStats = (day) => {
    const totals = dayTotals.find((t) => t.day === day) || {};
    return {
      present: totals.present || 0,
      late: totals.late || 0,
      absent: totals.absent || 0,
    };
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="group mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <svg className="h-4 w-4 transition group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Attendance Details
        </p>
        <h2 className="mt-2 text-3xl font-bold">{attendance.subject_name}</h2>
      </div>

      <div className="mb-6 grid gap-4 rounded-lg bg-white p-6 shadow-sm md:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{attendance.section}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatTime(attendance.attendance_time)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{attendance.room || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Students</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{totalStudents}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold">Day of Attendance</h3>
        </div>

        {isLoading && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">Loading day records...</p>
        )}

        {days.length > 0 && (
          <div className="divide-y divide-slate-200">
            {days.map((item) => {
              const stats = dayStats(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => onSelectDay(item.day)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <div>
                    <p className="font-semibold text-slate-950">Day {item.day}</p>
                    {item.created_at && (
                      <p className="mt-0.5 text-sm text-slate-400">
                        {new Date(item.created_at).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      P: {stats.present}
                    </span>
                    <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-700">
                      L: {stats.late}
                    </span>
                    <span className="rounded-md bg-rose-50 px-2.5 py-1 text-rose-700">
                      A: {stats.absent}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DayAttendance;
