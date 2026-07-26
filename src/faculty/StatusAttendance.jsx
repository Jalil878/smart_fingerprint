import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function StatusAttendance({ attendance, day, onBack }) {
  const [records, setRecords] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  useEffect(() => {
    const loadDayRecords = async () => {
      setError("");
      setIsLoading(true);

      const { data: recordsData, error: recordsError } = await supabase
        .from("attendance_records")
        .select("*, students!inner(first_name, middle_name, last_name, id_number, course)")
        .eq("attendance_session_id", attendance.id)
        .eq("day", day);

      if (recordsError) {
        setError(recordsError.message);
        setIsLoading(false);
        return;
      }

      setRecords(recordsData || []);

      const { data: countData } = await supabase.rpc("count_session_students", {
        p_session_id: attendance.id,
      });
      if (countData !== null) setTotalStudents(countData);

      setIsLoading(false);
    };

    loadDayRecords();
  }, [attendance.id, day]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const filteredRecords = statusFilter === "all"
    ? records
    : records.filter((r) => r.status === statusFilter);

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
          Day {day} Attendance
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
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-bold">Attendance Status - Day {day}</h3>
          <button
            type="button"
            onClick={() => {}}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save
          </button>
        </div>

        <div className="grid grid-cols-4 gap-0">
          <button type="button" onClick={() => setStatusFilter("all")} className={`border-r border-b px-5 py-4 text-left transition ${statusFilter === "all" ? "bg-slate-50" : "bg-white hover:bg-slate-50"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === "all" ? "text-slate-700" : "text-slate-500"}`}>All</p>
            <p className={`mt-1 text-2xl font-bold ${statusFilter === "all" ? "text-slate-900" : "text-slate-900"}`}>{records.length}</p>
          </button>
          <button type="button" onClick={() => setStatusFilter("present")} className={`border-r border-b px-5 py-4 text-left transition ${statusFilter === "present" ? "bg-emerald-50" : "bg-white hover:bg-slate-50"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === "present" ? "text-emerald-700" : "text-slate-500"}`}>Present</p>
            <p className={`mt-1 text-2xl font-bold ${statusFilter === "present" ? "text-emerald-600" : "text-slate-900"}`}>{presentCount}</p>
          </button>
          <button type="button" onClick={() => setStatusFilter("late")} className={`border-r border-b px-5 py-4 text-left transition ${statusFilter === "late" ? "bg-amber-50" : "bg-white hover:bg-slate-50"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === "late" ? "text-amber-700" : "text-slate-500"}`}>Late</p>
            <p className={`mt-1 text-2xl font-bold ${statusFilter === "late" ? "text-amber-600" : "text-slate-900"}`}>{lateCount}</p>
          </button>
          <button type="button" onClick={() => setStatusFilter("absent")} className={`border-b px-5 py-4 text-left transition ${statusFilter === "absent" ? "bg-rose-50" : "bg-white hover:bg-slate-50"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === "absent" ? "text-rose-700" : "text-slate-500"}`}>Absent</p>
            <p className={`mt-1 text-2xl font-bold ${statusFilter === "absent" ? "text-rose-600" : "text-slate-900"}`}>{absentCount}</p>
          </button>
        </div>

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
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm font-medium text-slate-500">
                    Loading attendance records...
                  </td>
                </tr>
              )}

              {!isLoading && records.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm font-medium text-slate-500">
                    No attendance records found for Day {day}.
                  </td>
                </tr>
              )}

              {!isLoading && filteredRecords.length === 0 && records.length > 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm font-medium text-slate-500">
                    No {statusFilter === "all" ? "" : statusFilter} records found.
                  </td>
                </tr>
              )}

              {!isLoading && filteredRecords.map((record) => {
                const s = record.students;
                const fullName = [s?.first_name, s?.middle_name, s?.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-950">{fullName}</td>
                    <td className="px-5 py-4 text-slate-600">{s?.id_number}</td>
                    <td className="px-5 py-4 text-slate-600">{s?.course || "\u2014"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                          record.status === "present"
                            ? "bg-emerald-50 text-emerald-700"
                            : record.status === "late"
                            ? "bg-amber-50 text-amber-700"
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
      </div>
    </div>
  );
}

export default StatusAttendance;
