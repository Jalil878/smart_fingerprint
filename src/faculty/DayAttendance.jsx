import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function DayAttendance({ attendance, onBack, dayRefreshKey, onSelectDay }) {
  const [records, setRecords] = useState([]);
  const [days, setDays] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

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
        .eq("attendance_id", attendance.id);

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
        setDays(data.map((d) => d.day));
      }
    };

    const loadTotalStudents = async () => {
      const { data } = await supabase.rpc("count_session_students", {
        p_session_id: attendance.id,
      });
      if (data !== null) setTotalStudents(data);
    };

    loadRecords();
    loadDays();
    loadTotalStudents();
  }, [attendance.id, dayRefreshKey]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  const openStudentsModal = async () => {
    setIsStudentsModalOpen(true);
    setStudentsError("");
    setIsStudentsLoading(true);

    const { data, error } = await supabase.rpc("get_session_students", {
      p_session_id: attendance.id,
    });

    if (error) {
      setStudentsError(error.message);
      setIsStudentsLoading(false);
      return;
    }

    setSessionStudents(data || []);
    setIsStudentsLoading(false);
  };

  const closeStudentsModal = () => {
    setIsStudentsModalOpen(false);
    setSessionStudents([]);
    setStudentsError("");
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
        <button
          type="button"
          onClick={openStudentsModal}
          className="rounded-lg p-4 text-left transition hover:bg-slate-50"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Students</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{totalStudents}</p>
        </button>
      </div>

      {!isLoading && records.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-700">Present</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{presentCount}</p>
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

        {days.length > 0 ? (
          <div className="px-5 py-4 text-sm font-medium">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`block w-full rounded-md px-3 py-2 text-left transition ${
                  selectedDay === d
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                Day {d}
              </button>
            ))}
          </div>
        ) : null}

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

      {isStudentsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="students-list-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 id="students-list-title" className="text-xl font-bold">
                Students - {attendance.subject_name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Section {attendance.section}
              </p>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {isStudentsLoading ? (
                <p className="px-6 py-6 text-sm font-medium text-slate-500">
                  Loading students...
                </p>
              ) : studentsError ? (
                <p className="px-6 py-6 text-sm font-medium text-rose-700">
                  {studentsError}
                </p>
              ) : sessionStudents.length === 0 ? (
                <p className="px-6 py-6 text-sm font-medium text-slate-500">
                  No students enrolled in this session.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Student Name</th>
                      <th className="px-6 py-3 font-semibold">Course</th>
                      <th className="px-6 py-3 font-semibold">ID Number</th>
                      <th className="px-6 py-3 font-semibold">Fingerprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sessionStudents.map((student) => {
                      const fullName = [
                        student.first_name,
                        student.middle_name,
                        student.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const hasFingerprint = Boolean(student.fingerprint_id);

                      return (
                        <tr key={student.id_number}>
                          <td className="px-6 py-3.5 font-semibold text-slate-950">
                            {fullName}
                          </td>
                          <td className="px-6 py-3.5 text-slate-600">
                            {student.course || "\u2014"}
                          </td>
                          <td className="px-6 py-3.5 text-slate-600">
                            {student.id_number}
                          </td>
                          <td className="px-6 py-3.5">
                            {hasFingerprint ? (
                              <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Enrolled
                              </span>
                            ) : (
                              <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                Not Enrolled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeStudentsModal}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DayAttendance;
