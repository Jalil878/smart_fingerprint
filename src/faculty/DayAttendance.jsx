import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function DayAttendance({ attendance, onBack, dayRefreshKey, onSelectDay }) {
  const [records, setRecords] = useState([]);
  const [dayTotals, setDayTotals] = useState([]);
  const [days, setDays] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  useEffect(() => {
    const loadRecords = async () => {
      setError("");
      setIsLoading(true);

      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, students!inner(first_name, middle_name, last_name, id_number, course)")
        .eq("attendance_session_id", attendance.id);

      setIsLoading(false);

      if (error) {
        setError(error.message);
        return;
      }

      setRecords(data || []);
    };

    const loadDays = async () => {
      const { data } = await supabase.rpc("get_session_days", {
        p_session_id: attendance.id,
      });
      if (data) {
        setDays(data || []);
      }
    };

    const loadTotalStudents = async () => {
      const { data } = await supabase.rpc("count_session_students", {
        p_session_id: attendance.id,
      });
      if (data !== null) setTotalStudents(data);
    };

    const loadDayTotals = async () => {
      const { data, error } = await supabase.rpc("get_session_day_totals", {
        p_session_id: attendance.id,
      });

      if (!error) {
        setDayTotals(data || []);
      }
    };

    loadRecords();
    loadDays();
    loadDayTotals();
    loadTotalStudents();
  }, [attendance.id, dayRefreshKey]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

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

      {!isLoading && records.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">Present</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{presentCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-medium text-amber-700">Late</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{lateCount}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-medium text-rose-700">Absent</p>
            <p className="mt-2 text-3xl font-bold text-rose-600">{absentCount}</p>
          </div>
        </div>
      )}

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

        {!isLoading && records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Student Name</th>
                  <th className="px-5 py-3 font-semibold">ID Number</th>
                  <th className="px-5 py-3 font-semibold">Course</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((record) => {
                  const s = record.students;
                  const fullName = [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean).join(" ");
                  return (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-950">{fullName}</td>
                      <td className="px-5 py-4 text-slate-600">{s?.id_number}</td>
                      <td className="px-5 py-4 text-slate-600">{s?.course || "—"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                            record.status === "present"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

export default DayAttendance;
