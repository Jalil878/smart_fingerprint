import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function DayAttendanceStudents({ classItem, onBack }) {
  const [records, setRecords] = useState([]);
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
    if (!classItem?.id) {
      setError("Class session ID is missing. Refresh the page.");
      setIsLoading(false);
      return;
    }

    const loadRecords = async () => {
      setError("");
      setIsLoading(true);

      const { data, error } = await supabase.rpc(
        "get_student_session_records",
        { p_session_id: classItem.id },
      );

      setIsLoading(false);

      if (error) {
        setError(error.message);
        return;
      }

      setRecords(data || []);
    };

    loadRecords();
  }, [classItem.id]);

  const statusStyle = (status) => {
    if (status === "present") return "bg-emerald-50 text-emerald-700";
    if (status === "late") return "bg-amber-50 text-amber-700";
    return "bg-rose-50 text-rose-700";
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
          Back to My Classes
        </button>

        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          My Attendance
        </p>
        <h2 className="mt-2 text-3xl font-bold">{classItem.subject_name}</h2>
      </div>

      <div className="mb-6 grid gap-4 rounded-lg bg-white p-6 shadow-sm md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{classItem.section}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatTime(classItem.attendance_time)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{classItem.room || "N/A"}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold">Day of Attendance</h3>
        </div>

        {isLoading && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">Loading attendance records...</p>
        )}

        {!isLoading && error && (
          <p className="m-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        {!isLoading && !error && records.length === 0 && (
          <p className="px-5 py-6 text-sm text-slate-500">
            No attendance records for this class yet.
          </p>
        )}

        {!isLoading && records.length > 0 && (
          <div className="divide-y divide-slate-200">
            {records.map((record) => (
              <div
                key={`${record.day}-${record.status}`}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-slate-950">Day {record.day}</p>
                  {record.date_time_attend && (
                    <p className="mt-0.5 text-sm text-slate-400">
                      {new Date(record.date_time_attend).toLocaleString(
                        undefined,
                        { dateStyle: "short", timeStyle: "short" },
                      )}
                    </p>
                  )}
                </div>
                <span className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${statusStyle(record.status)}`}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DayAttendanceStudents;