import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  verifyFingerprint,
  setEsp32BaseUrl,
} from "../lib/esp32Api";

function StatusAttendance({
  attendance,
  day,
  onBack,
  isScanning,
  onScanMessage,
}) {
  const [records, setRecords] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessionStudents, setSessionStudents] = useState([]);
  const [deviceUrl, setDeviceUrl] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveError, setSaveError] = useState("");
  const scanningRef = useRef(false);
  const recordsRef = useRef([]);
  const sessionStudentsRef = useRef([]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    sessionStudentsRef.current = sessionStudents;
  }, [sessionStudents]);

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const buildMergedRecords = (recordsData, sessionStudentsData) => {
    const studentsById = new Map(
      (sessionStudentsData || []).map((student) => [
        Number(student.id_number),
        student,
      ]),
    );

    return (recordsData || []).map((record) => ({
      id: record.id,
      day: record.day,
      attendance_session_id: record.attendance_session_id,
      faculty_id_number: record.faculty_id_number,
      student_id_number: record.student_id_number,
      status: record.status,
      date_time_attend: record.date_time_attend,
      students:
        studentsById.get(Number(record.student_id_number)) || {
          id_number: record.student_id_number,
          first_name: record.first_name,
          middle_name: record.middle_name,
          last_name: record.last_name,
          course: record.course,
          fingerprint_id: record.fingerprint_id,
        },
    }));
  };

  useEffect(() => {
    const loadDayRecords = async () => {
      setError("");
      setIsLoading(true);

      const { data: deviceData, error: deviceError } = await supabase
        .from("fingerprint_device")
        .select("device_url")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!deviceError && deviceData?.device_url) {
        setDeviceUrl(deviceData.device_url);
        setEsp32BaseUrl(deviceData.device_url);
      }

      const { data: recordsData, error: recordsError } = await supabase.rpc(
        "get_day_attendance_records",
        {
          p_session_id: attendance.id,
          p_day: day,
        },
      );

      if (recordsError) {
        setError(recordsError.message);
        setIsLoading(false);
        return;
      }

      const { data: sessionStudentsData, error: studentsError } =
        await supabase.rpc("get_session_students", {
          p_session_id: attendance.id,
        });

      if (studentsError) {
        setError(studentsError.message);
        setIsLoading(false);
        return;
      }

      const mergedRecords = buildMergedRecords(
        recordsData,
        sessionStudentsData,
      );

      setRecords(mergedRecords);

      const { data: countData } = await supabase.rpc("count_session_students", {
        p_session_id: attendance.id,
      });
      if (countData !== null) setTotalStudents(countData);

      const statusByIdNumber = new Map(
        (mergedRecords || []).map((record) => [
          Number(record.student_id_number),
          record.status,
        ]),
      );

      setSessionStudents(
        (sessionStudentsData || []).map((student) => ({
          ...student,
          status: statusByIdNumber.get(Number(student.id_number)) || null,
        })),
      );

      setIsLoading(false);
    };

    loadDayRecords();
  }, [attendance.id, day]);

  useEffect(() => {
    return () => {
      scanningRef.current = false;
    };
  }, []);

  const refreshRecords = async () => {
    const { data: refreshData, error: refreshError } = await supabase.rpc(
      "get_day_attendance_records",
      {
        p_session_id: attendance.id,
        p_day: day,
      },
    );

    if (refreshError) {
      return;
    }

    const { data: sessionStudentsData, error: studentsError } =
      await supabase.rpc("get_session_students", {
        p_session_id: attendance.id,
      });

    if (studentsError) {
      return;
    }

    const mergedRecords = buildMergedRecords(refreshData, sessionStudentsData);

    setRecords(mergedRecords);
    const statusByIdNumber = new Map(
      mergedRecords.map((record) => [
        Number(record.student_id_number),
        record.status,
      ]),
    );
    setSessionStudents((current) =>
      current.map((student) => ({
        ...student,
        status:
          statusByIdNumber.get(Number(student.id_number)) || null,
      })),
    );
  };

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    scanningRef.current = true;
    onScanMessage?.(
      `Scanning fingerprints${deviceUrl ? ` (${deviceUrl})` : ""}...`,
    );

    let cancelled = false;

    const scanLoop = async () => {
      while (scanningRef.current && !cancelled) {
        try {
          const result = await verifyFingerprint();
          const matchedId = Number(result?.id);

          if (!matchedId) {
            setScanStatus("Waiting for fingerprint...");
            continue;
          }

          const currentStudents = sessionStudentsRef.current;
          const currentRecords = recordsRef.current;

          const matchedStudent = currentStudents.find(
            (student) => Number(student.fingerprint_id) === matchedId,
          );

          if (!matchedStudent) {
            setScanStatus(`Fingerprint ID ${matchedId} is not in this session.`);
            onScanMessage?.(`ID ${matchedId} not in session.`);
            continue;
          }

          const alreadyRecorded = currentRecords.some(
            (record) =>
              Number(record.student_id_number) ===
              Number(matchedStudent.id_number),
          );

          if (alreadyRecorded) {
            setScanStatus(
              `${[matchedStudent.first_name, matchedStudent.last_name].filter(Boolean).join(" ")} already marked present.`,
            );
            continue;
          }

          const { error: insertError } = await supabase.rpc(
            "record_attendance",
            {
              p_session_id: attendance.id,
              p_day: day,
              p_student_id_number: matchedStudent.id_number,
            },
          );

          if (insertError) {
            setScanStatus(`Failed to save attendance: ${insertError.message}`);
            continue;
          }

          const fullName = [
            matchedStudent.first_name,
            matchedStudent.middle_name,
            matchedStudent.last_name,
          ]
            .filter(Boolean)
            .join(" ");
          setScanStatus(`${fullName} marked present.`);
          onScanMessage?.(`${fullName} marked present.`);

          await refreshRecords();
        } catch (scanError) {
          const message =
            scanError instanceof Error
              ? scanError.message
              : "Scan failed";
          setScanStatus(message);
        }
      }
    };

    scanLoop();

    return () => {
      cancelled = true;
      scanningRef.current = false;
    };
  }, [isScanning, deviceUrl, attendance.id, day, onScanMessage, refreshRecords]);

  useEffect(() => {
    if (!isScanning) {
      setScanStatus("");
    }
  }, [isScanning]);

  useEffect(() => {
    if (!scanStatus) {
      return;
    }

    const timer = setTimeout(() => {
      setScanStatus("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [scanStatus]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const noRecordCount = sessionStudents.length - (presentCount + lateCount + absentCount);

  const handleSaveAttendance = async () => {
    setSaveError("");
    setIsSavingAttendance(true);

    const { data: markedCount, error: markError } = await supabase.rpc(
      "mark_absent_students",
      {
        p_session_id: attendance.id,
        p_day: day,
      },
    );

    if (markError) {
      setSaveError(markError.message);
      setIsSavingAttendance(false);
      return;
    }

    setIsSavingAttendance(false);
    setShowSaveModal(false);

    await refreshRecords();
    setScanStatus(`${markedCount} student${markedCount === 1 ? "" : "s"} marked absent.`);
  };

  const recordToStudent = (record) => ({
    id_number: record.students?.id_number ?? record.student_id_number,
    first_name: record.students?.first_name,
    middle_name: record.students?.middle_name,
    last_name: record.students?.last_name,
    course: record.students?.course,
    fingerprint_id: record.students?.fingerprint_id,
    status: record.status,
  });

  const displayedStudents =
    statusFilter === "present"
      ? records.filter((r) => r.status === "present").map(recordToStudent)
      : statusFilter === "late"
        ? records.filter((r) => r.status === "late").map(recordToStudent)
        : statusFilter === "absent"
          ? records.filter((r) => r.status === "absent").map(recordToStudent)
          : sessionStudents;

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

      {scanStatus && (
        <div className="mb-6 rounded-lg bg-slate-900 px-5 py-4 text-center text-sm font-semibold text-white">
          {scanStatus}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

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
            onClick={() => {
              setSaveError("");
              setShowSaveModal(true);
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Save
          </button>
        </div>

        <div className="grid grid-cols-4 gap-0">
          <button type="button" onClick={() => setStatusFilter("all")} className={`border-r border-b px-5 py-4 text-left transition ${statusFilter === "all" ? "bg-slate-50" : "bg-white hover:bg-slate-50"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === "all" ? "text-slate-700" : "text-slate-500"}`}>All</p>
            <p className={`mt-1 text-2xl font-bold ${statusFilter === "all" ? "text-slate-900" : "text-slate-900"}`}>{sessionStudents.length}</p>
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
                <th className="px-5 py-3 font-semibold">Fingerprint</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm font-medium text-slate-500">
                    Loading students...
                  </td>
                </tr>
              )}

              {!isLoading && displayedStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm font-medium text-slate-500">
                    No {statusFilter === "all" ? "" : `${statusFilter} `}
                    students found.
                  </td>
                </tr>
              )}

              {!isLoading && displayedStudents.map((student) => {
                const fullName = [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
                const hasFingerprint = Boolean(student.fingerprint_id);
                return (
                  <tr key={student.id_number} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-950">{fullName}</td>
                    <td className="px-5 py-4 text-slate-600">{student.id_number}</td>
                    <td className="px-5 py-4 text-slate-600">{student.course || "\u2014"}</td>
                    <td className="px-5 py-4">
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
                    <td className="px-5 py-4">
                      {student.status ? (
                        <span
                          className={`inline-block rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                            student.status === "present"
                              ? "bg-emerald-50 text-emerald-700"
                              : student.status === "late"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {student.status}
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          No record
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <h3 className="text-xl font-bold text-slate-950">Save Attendance</h3>
              <p className="mt-1 text-sm text-slate-500">
                {noRecordCount} student
                {noRecordCount === 1 ? "" : "s"} with no record will be marked absent.
              </p>
              {saveError && (
                <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {saveError}
                </p>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                disabled={isSavingAttendance}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance}
                className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingAttendance ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusAttendance;
