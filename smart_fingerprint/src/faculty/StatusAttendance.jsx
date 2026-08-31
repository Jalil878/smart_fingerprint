import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  verifyFingerprint,
  startScanning,
  showMatchedStudentOnDevice,
  setEsp32BaseUrl,
} from "../lib/esp32Api";

function StatusAttendance({
  attendance,
  day,
  onBack,
  isScanning,
  onScanMessage,
  onStopScanning,
}) {
  const [records, setRecords] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessionStudents, setSessionStudents] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [deviceUrl, setDeviceUrl] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [timerInput, setTimerInput] = useState("15");
  const [timerRunning, setTimerRunning] = useState(false);
  const scanningRef = useRef(false);
  const recordsRef = useRef([]);
  const sessionStudentsRef = useRef([]);
  const onScanMessageRef = useRef(onScanMessage);
  const onStopScanningRef = useRef(onStopScanning);
  const timerMinutesRef = useRef(timerMinutes);
  const secondsLeftRef = useRef(secondsLeft);
  const timerEnabledRef = useRef(timerEnabled);

  useEffect(() => {
    onScanMessageRef.current = onScanMessage;
  }, [onScanMessage]);

  useEffect(() => {
    onStopScanningRef.current = onStopScanning;
  }, [onStopScanning]);

  useEffect(() => {
    timerMinutesRef.current = timerMinutes;
  }, [timerMinutes]);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    timerEnabledRef.current = timerEnabled;
  }, [timerEnabled]);

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

      // Ensure fingerprint_id is present — the RPC may not include it.
      // If any student is missing it, do a single bulk fetch from the students table.
      const needsFingerprint = (sessionStudentsData || []).some(
        (s) => s.fingerprint_id === undefined || s.fingerprint_id === null,
      );
      let enrichedStudents = sessionStudentsData || [];
      if (needsFingerprint && enrichedStudents.length > 0) {
        const idNumbers = enrichedStudents.map((s) => s.id_number);
        const { data: fullStudents } = await supabase
          .from("students")
          .select("id_number, fingerprint_id")
          .in("id_number", idNumbers);
        if (fullStudents) {
          const fpMap = new Map(
            fullStudents.map((s) => [Number(s.id_number), s.fingerprint_id]),
          );
          enrichedStudents = enrichedStudents.map((s) => ({
            ...s,
            fingerprint_id: s.fingerprint_id ?? fpMap.get(Number(s.id_number)) ?? null,
          }));
        }
      }

      const mergedRecords = buildMergedRecords(
        recordsData,
        enrichedStudents,
      );

      setRecords(mergedRecords);

      const { data: countData } = await supabase.rpc("count_session_students", {
        p_session_id: attendance.id,
      });
      if (countData !== null) setTotalStudents(countData);

      const { data: metaData } = await supabase
        .from("attendance_sessions")
        .select("course_code, semester, academic_year")
        .eq("id", attendance.id)
        .maybeSingle();
      setSessionMeta(metaData || null);

      const statusByIdNumber = new Map(
        (mergedRecords || []).map((record) => [
          Number(record.student_id_number),
          record.status,
        ]),
      );

      setSessionStudents(
        enrichedStudents.map((student) => ({
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

  const refreshRecords = useCallback(async () => {
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
  }, [attendance.id, day]);

  useEffect(() => {
    if (!isScanning) {
      return;
    }

    startScanning().catch(() => {
      // If firmware does not expose /start yet, keep old behavior.
    });

    scanningRef.current = true;
    setScanStatus("Waiting for fingerprint...");
    onScanMessageRef.current?.(
      `Scanning fingerprints${deviceUrl ? ` (${deviceUrl})` : ""}...`,
    );

    let cancelled = false;

    const scanLoop = async () => {
      const findMatchedStudentByScanId = (studentsList, scanId) => {
        if (!Array.isArray(studentsList) || !scanId) {
          return null;
        }

        return (
          studentsList.find(
            (student) => Number(student.fingerprint_id) === Number(scanId),
          ) ||
          studentsList.find(
            (student) => Number(student.id_number) === Number(scanId),
          ) ||
          null
        );
      };

      while (scanningRef.current && !cancelled) {
        try {
          const result = await verifyFingerprint();

          // Exit immediately if stopped while waiting for verify
          if (!scanningRef.current || cancelled) break;

          // Clear any previous connection error now that we got a response
          const matchedId = Number(result?.id ?? result?.fingerprint_id ?? result?.fingerprintId ?? result?.finger_id);

          if (!matchedId || matchedId <= 0) {
            setScanStatus("Waiting for fingerprint...");
            continue;
          }

          const currentStudents = sessionStudentsRef.current;
          const currentRecords = recordsRef.current;

          let matchedStudent = findMatchedStudentByScanId(
            currentStudents,
            matchedId,
          );

          // Fallback: refresh session students in case the local list is stale/not loaded yet
          if (!matchedStudent) {
            const { data: latestStudents, error: latestStudentsError } =
              await supabase.rpc("get_session_students", {
                p_session_id: attendance.id,
              });

            if (!latestStudentsError && Array.isArray(latestStudents)) {
              matchedStudent = findMatchedStudentByScanId(
                latestStudents,
                matchedId,
              );

              const statusByIdNumber = new Map(
                currentStudents.map((student) => [
                  Number(student.id_number),
                  student.status ?? null,
                ]),
              );

              const mergedLatestStudents = latestStudents.map((student) => ({
                ...student,
                status:
                  statusByIdNumber.get(Number(student.id_number)) ?? null,
              }));

              setSessionStudents(mergedLatestStudents);
            }
          }

          if (!matchedStudent) {
            setScanStatus(`Fingerprint ID ${matchedId} is not in this session.`);
            onScanMessageRef.current?.(`ID ${matchedId} not in session.`);
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

          const isLate =
            timerEnabledRef.current && secondsLeftRef.current === 0;

          const { error: insertError } = await supabase.rpc(
            "record_attendance",
            {
              p_session_id: attendance.id,
              p_day: day,
              p_student_id_number: matchedStudent.id_number,
              p_status: isLate ? "late" : "present",
            },
          );

          if (!scanningRef.current || cancelled) break;

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
          const statusLabel = isLate ? "late" : "present";

          try {
            await showMatchedStudentOnDevice(matchedStudent.last_name);
          } catch {
            // Optional device display endpoint; ignore if firmware does not support it.
          }

          setScanStatus(`${fullName} marked ${statusLabel}.`);
          onScanMessageRef.current?.(`${fullName} marked ${statusLabel}.`);

          await refreshRecords();

          if (!scanningRef.current || cancelled) break;
        } catch (scanError) {
          const message =
            scanError instanceof Error ? scanError.message : "Scan failed";

          // Silently exit loop when scanning was stopped intentionally
          if (message === "SCAN_STOPPED") {
            break;
          }

          // For network/connection errors: stop scanning and show one clear message
          const isNetworkError =
            message.startsWith("Cannot reach") ||
            message.includes("Failed to fetch") ||
            message.includes("NetworkError");

          if (isNetworkError) {
            setScanStatus("Device unreachable. Check connection and press Start again.");
            onScanMessageRef.current?.("Device unreachable.");
            scanningRef.current = false;
            onStopScanningRef.current?.();
            break;
          }

          setScanStatus(message);
        }
      }
    };

    scanLoop();

    return () => {
      cancelled = true;
      scanningRef.current = false;
    };
  }, [isScanning, deviceUrl, refreshRecords]);

  useEffect(() => {
    if (!isScanning) {
      setScanStatus("");
    }
  }, [isScanning]);

  useEffect(() => {
    if (!scanStatus) {
      return;
    }

    if (isScanning && scanStatus === "Waiting for fingerprint...") {
      return;
    }

    const timer = setTimeout(() => {
      setScanStatus("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [scanStatus, isScanning]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const noRecordCount = sessionStudents.length - (presentCount + lateCount + absentCount);

  const handleToggleTimer = (enabled) => {
    setTimerEnabled(enabled);
    if (!enabled) {
      setIsEditingTimer(false);
    }
    if (enabled) {
      setSecondsLeft(timerMinutes * 60);
    }
  };

  const confirmTimerEdit = () => {
    const parsed = parseInt(timerInput, 10);
    const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
    setTimerMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setIsEditingTimer(false);
  };

  useEffect(() => {
    if (!isScanning) {
      setTimerRunning(false);
      return;
    }

    setTimerRunning(true);
    setSecondsLeft(timerMinutesRef.current * 60);
  }, [isScanning]);

  useEffect(() => {
    if (!timerRunning || !timerEnabled || secondsLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerEnabled, secondsLeft]);

  useEffect(() => {
    if (timerRunning && timerEnabled && secondsLeft === 0) {
      setScanStatus("Timer ended. New scans will be marked late.");
    }
  }, [timerRunning, timerEnabled, secondsLeft]);


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

  const resolvedCourseCode = sessionMeta?.course_code || attendance.course_code;
  const resolvedAcademicYear =
    sessionMeta?.academic_year || attendance.academic_year;

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
        <h2 className="mt-2 text-3xl font-bold">
          {resolvedCourseCode
            ? `${resolvedCourseCode} - ${attendance.subject_name}`
            : attendance.subject_name}
        </h2>
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

      <div className="mb-6 grid gap-4 rounded-lg bg-white p-6 shadow-sm md:grid-cols-5">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Academic Year</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{resolvedAcademicYear || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Students</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{totalStudents}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">Attendance Status</h3>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(event) => handleToggleTimer(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              Timer
            </label>

            {isEditingTimer ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={timerInput}
                  onChange={(event) => setTimerInput(event.target.value)}
                  className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm font-semibold outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                <span className="text-sm text-slate-500">min</span>
                <button
                  type="button"
                  onClick={confirmTimerEdit}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!timerEnabled}
                onClick={() => {
                  if (!timerEnabled) return;
                  setTimerInput(String(timerMinutes));
                  setIsEditingTimer(true);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm font-bold tabular-nums text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                title={
                  timerEnabled
                    ? "Click to edit the timer"
                    : "Check the Timer box to enable the timer"
                }
              >
                {timerEnabled
                  ? `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`
                  : `${String(timerMinutes).padStart(2, "0")}:00`}
              </button>
            )}
          </div>

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

        <div className="md:hidden">
          {isLoading && (
            <p className="px-5 py-6 text-center text-sm font-medium text-slate-500">
              Loading students...
            </p>
          )}

          {!isLoading && displayedStudents.length === 0 && (
            <p className="px-5 py-6 text-center text-sm font-medium text-slate-500">
              No {statusFilter === "all" ? "" : `${statusFilter} `}
              students found.
            </p>
          )}

          {!isLoading && displayedStudents.length > 0 && (
            <div className="space-y-3 p-4">
              {displayedStudents.map((student) => {
                const fullName = [
                  student.first_name,
                  student.middle_name,
                  student.last_name,
                ]
                  .filter(Boolean)
                  .join(" ");
                const hasFingerprint = Boolean(student.fingerprint_id);

                return (
                  <article
                    key={student.id_number}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">{fullName}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {student.course || "\u2014"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-slate-600">{student.id_number}</p>
                          {hasFingerprint ? (
                            <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Enrolled
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                              Not Enrolled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
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
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
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
