import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CreateAttendance from "./CreateAttendance";
import DayAttendance from "./DayAttendance";
import StatusAttendance from "./StatusAttendance";
import MyProfile from "./MyProfile";

function FacultyDashboard({ profile, onLogout, onProfileUpdate }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

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

  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDayError, setCreateDayError] = useState("");
  const [dayRefreshKey, setDayRefreshKey] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [showStudentsList, setShowStudentsList] = useState(false);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [studentsListError, setStudentsListError] = useState("");
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [isAllStudentsLoading, setIsAllStudentsLoading] = useState(false);
  const [allStudentsError, setAllStudentsError] = useState("");
  const [addStudentsSearchTerm, setAddStudentsSearchTerm] = useState("");
  const [selectedAddStudentIds, setSelectedAddStudentIds] = useState([]);
  const [isAddingStudents, setIsAddingStudents] = useState(false);
  const [showEditSubject, setShowEditSubject] = useState(false);
  const [editSubjectData, setEditSubjectData] = useState({
    subject_name: "",
    section: "",
    attendance_time: "",
    room: "",
  });
  const [editSubjectError, setEditSubjectError] = useState("");
  const [isSavingEditSubject, setIsSavingEditSubject] = useState(false);

  const handleGoToDashboard = () => {
    setActivePage("dashboard");
    setSelectedAttendance(null);
    setSelectedDay(null);
  };

  const handleBackToDayAttendance = () => {
    setActivePage("day attendance");
  };

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    setActivePage("status attendance");
  };

  const handleCreateDay = async () => {
    if (!selectedAttendance) return;

    const { data: nextDay, error } = await supabase.rpc(
      "add_day_to_session",
      { p_session_id: selectedAttendance.id }
    );

    if (error) {
      setCreateDayError(error.message);
      return;
    }

    setDayRefreshKey((k) => k + 1);
    setShowCreateModal(false);
  };

  const openStudentsList = async () => {
    if (!selectedAttendance) return;

    setShowStudentsList(true);
    setStudentsListError("");
    setIsStudentsLoading(true);

    const { data, error } = await supabase.rpc("get_session_students", {
      p_session_id: selectedAttendance.id,
    });

    setIsStudentsLoading(false);

    if (error) {
      setStudentsListError(error.message);
      return;
    }

    setSessionStudents(data || []);
  };

  const closeStudentsList = () => {
    setShowStudentsList(false);
    setSessionStudents([]);
    setStudentsListError("");
  };

  const openAddStudents = async () => {
    if (!selectedAttendance) return;

    setShowAddStudents(true);
    setAllStudentsError("");
    setIsAllStudentsLoading(true);
    setAddStudentsSearchTerm("");
    setSelectedAddStudentIds([]);

    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, middle_name, last_name, id_number, course")
      .order("last_name", { ascending: true });

    setIsAllStudentsLoading(false);

    if (error) {
      setAllStudentsError(error.message);
      return;
    }

    setAllStudents(data || []);
  };

  const closeAddStudents = () => {
    setShowAddStudents(false);
    setAllStudents([]);
    setAllStudentsError("");
    setSelectedAddStudentIds([]);
    setAddStudentsSearchTerm("");
  };

  const toggleAddStudent = (studentIdNumber) => {
    setSelectedAddStudentIds((currentIds) =>
      currentIds.includes(studentIdNumber)
        ? currentIds.filter((idNumber) => idNumber !== studentIdNumber)
        : [...currentIds, studentIdNumber],
    );
  };

  const handleAddStudents = async () => {
    if (!selectedAttendance) return;

    if (selectedAddStudentIds.length === 0) {
      setAllStudentsError("Please select at least one student.");
      return;
    }

    setAllStudentsError("");
    setIsAddingStudents(true);

    const { error } = await supabase.rpc("add_students_to_session", {
      p_session_id: selectedAttendance.id,
      p_student_id_numbers: selectedAddStudentIds,
    });

    setIsAddingStudents(false);

    if (error) {
      setAllStudentsError(error.message);
      return;
    }

    closeAddStudents();

    const { data, error: listError } = await supabase.rpc(
      "get_session_students",
      { p_session_id: selectedAttendance.id },
    );

    if (!listError) {
      setSessionStudents(data || []);
    }
  };

  const openEditSubject = () => {
    if (!selectedAttendance) return;

    setEditSubjectData({
      subject_name: selectedAttendance.subject_name,
      section: selectedAttendance.section,
      attendance_time: selectedAttendance.attendance_time,
      room: selectedAttendance.room || "",
    });
    setEditSubjectError("");
    setShowEditSubject(true);
  };

  const handleEditSubject = async () => {
    if (!selectedAttendance) return;

    const subjectName = editSubjectData.subject_name.trim();
    const section = editSubjectData.section.trim();
    const attendanceTime = editSubjectData.attendance_time;

    if (!subjectName) {
      setEditSubjectError("Please enter the subject name.");
      return;
    }

    if (!section) {
      setEditSubjectError("Please enter the section.");
      return;
    }

    if (!attendanceTime) {
      setEditSubjectError("Please select the attendance time.");
      return;
    }

    setEditSubjectError("");
    setIsSavingEditSubject(true);

    const { error } = await supabase.rpc("update_attendance_session", {
      p_session_id: selectedAttendance.id,
      p_subject_name: subjectName,
      p_section: section,
      p_attendance_time: attendanceTime,
      p_room: editSubjectData.room.trim() || null,
    });

    setIsSavingEditSubject(false);

    if (error) {
      setEditSubjectError(error.message);
      return;
    }

    const updatedAttendance = {
      ...selectedAttendance,
      subject_name: subjectName,
      section: section,
      attendance_time: attendanceTime,
      room: editSubjectData.room.trim() || null,
    };

    setSelectedAttendance(updatedAttendance);
    setAttendanceSessions((current) =>
      current.map((item) =>
        item.id === updatedAttendance.id ? updatedAttendance : item
      )
    );
    setShowEditSubject(false);
  };

  const normalizedAddStudentsSearchTerm =
    addStudentsSearchTerm.trim().toLowerCase();
  const enrolledStudentIdNumbers = new Set(
    sessionStudents.map((student) => student.id_number),
  );
  const availableStudents = allStudents.filter(
    (student) => !enrolledStudentIdNumbers.has(student.id_number),
  );
  const filteredAddStudents = normalizedAddStudentsSearchTerm
    ? availableStudents.filter((student) => {
        const fullName = [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(" ");
        const searchableText = [fullName, student.id_number, student.course]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedAddStudentsSearchTerm);
      })
    : availableStudents;

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
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedAttendance(item);
                      setActivePage("day attendance");
                    }}
                    className="w-full grid gap-4 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-950">
                        {item.subject_name}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.section} - {formatTime(item.attendance_time)}
                        {item.room ? ` - ${item.room}` : ""}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      View
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activePage === "day attendance" && selectedAttendance && (
          <DayAttendance
            attendance={selectedAttendance}
            onBack={handleGoToDashboard}
            dayRefreshKey={dayRefreshKey}
            onSelectDay={handleSelectDay}
          />
        )}

        {activePage === "status attendance" && selectedAttendance && selectedDay && (
          <StatusAttendance
            attendance={selectedAttendance}
            day={selectedDay}
            onBack={handleBackToDayAttendance}
            isScanning={isScanning}
            onScanMessage={setScanMessage}
          />
        )}

        {activePage === "create attendance" && (
          <CreateAttendance
            onGoToDashboard={handleGoToDashboard}
            onSaved={handleAttendanceSaved}
          />
        )}

        {activePage === "profile" && (
          <MyProfile profile={profile} onProfileUpdate={onProfileUpdate} />
        )}
      </section>

      <nav className="animate-fade-in-up fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 pb-3 pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]" style={{ animationDelay: '0.3s' }}>
        {scanMessage && (
          <p className="mb-2 rounded-md bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white">
            {scanMessage}
          </p>
        )}
        <div className="mx-auto flex max-w-sm items-center justify-around">
          {(activePage === "status attendance"
            ? [
                {
                  key: "start",
                  label: "Start",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ),
                },
                {
                  key: "stop",
                  label: "Stop",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ),
                },
              ]
            : activePage === "day attendance"
            ? [
                {
                  key: "list students",
                  label: "List Student",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                },
                {
                  key: "edit subject",
                  label: "Edit Subject",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  ),
                },
                {
                  key: "create attendance",
                  label: "Create Day",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  ),
                },
              ]
            : [
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
                  key: "profile",
                  label: "My Profile",
                  icon: (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
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
              ]
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (activePage === "day attendance") {
                  if (key === "list students") {
                    openStudentsList();
                  } else if (key === "edit subject") {
                    openEditSubject();
                  } else {
                    setCreateDayError("");
                    setShowCreateModal(true);
                  }
                } else if (activePage === "status attendance") {
                  if (key === "start") {
                    setScanMessage("Starting fingerprint attendance...");
                    setIsScanning(true);
                  } else if (key === "stop") {
                    setIsScanning(false);
                    setScanMessage("Fingerprint attendance stopped.");
                  }
                } else {
                  if (key === "profile") {
                    setActivePage("profile");
                  } else {
                    setActivePage(key);
                  }
                }
              }}
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <h3 className="text-xl font-bold text-slate-950">Create Day</h3>
              <p className="mt-1 text-sm text-slate-500">Choose an option below.</p>
              {createDayError && (
                <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{createDayError}</p>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateDayError("");
                }}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDay}
                className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentsList && selectedAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="students-list-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div
              className={`flex transition-transform duration-300 ease-in-out ${
                showAddStudents ? "-translate-x-full" : "translate-x-0"
              }`}
            >
              <div className="w-full shrink-0">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 id="students-list-title" className="text-xl font-bold">
                        Students - {selectedAttendance.subject_name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Section {selectedAttendance.section}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAddStudents}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Students
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {isStudentsLoading ? (
                    <p className="px-6 py-6 text-sm font-medium text-slate-500">
                      Loading students...
                    </p>
                  ) : studentsListError ? (
                    <p className="px-6 py-6 text-sm font-medium text-rose-700">
                      {studentsListError}
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

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={closeStudentsList}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Add Students slide panel */}
              <div className="w-full shrink-0">
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {selectedAttendance.subject_name}
                    </p>
                    <h3 id="add-students-title" className="mt-1 text-xl font-bold text-slate-950">
                      Add Students
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Choose students to add to this attendance session.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeAddStudents}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Back to students list"
                  >
                    Back
                  </button>
                </div>

                <div className="border-b border-slate-200 px-6 py-4">
                  <input
                    type="search"
                    value={addStudentsSearchTerm}
                    onChange={(event) => setAddStudentsSearchTerm(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Search student name, ID, or course"
                  />
                </div>

                <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
                  {isAllStudentsLoading && (
                    <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                      Loading students...
                    </p>
                  )}

                  {allStudentsError && (
                    <p className="rounded-lg bg-rose-50 px-4 py-5 text-sm font-medium text-rose-700">
                      {allStudentsError}
                    </p>
                  )}

                  {!isAllStudentsLoading &&
                    !allStudentsError &&
                    filteredAddStudents.length === 0 && (
                      <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                        No students found.
                      </p>
                    )}

                  <div className="space-y-2">
                    {filteredAddStudents.map((student) => {
                      const fullName = [
                        student.first_name,
                        student.middle_name,
                        student.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const isSelected = selectedAddStudentIds.includes(
                        student.id_number,
                      );

                      return (
                        <label
                          key={student.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-50"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAddStudent(student.id_number)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <div>
                            <p className="font-semibold text-slate-950">{fullName}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {student.id_number} - {student.course}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <p className="text-sm font-medium text-slate-500">
                    {selectedAddStudentIds.length} selected
                  </p>
                  <button
                    type="button"
                    onClick={handleAddStudents}
                    disabled={isAddingStudents}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAddingStudents ? "Adding..." : "Add Students"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditSubject && selectedAttendance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-subject-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Attendance details
              </p>
              <h3 id="edit-subject-title" className="mt-1 text-xl font-bold text-slate-950">
                Edit Subject
              </h3>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Subject name
                </label>
                <input
                  type="text"
                  value={editSubjectData.subject_name}
                  onChange={(event) =>
                    setEditSubjectData((current) => ({
                      ...current,
                      subject_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Section
                </label>
                <input
                  type="text"
                  value={editSubjectData.section}
                  onChange={(event) =>
                    setEditSubjectData((current) => ({
                      ...current,
                      section: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Time
                </label>
                <input
                  type="time"
                  value={editSubjectData.attendance_time}
                  onChange={(event) =>
                    setEditSubjectData((current) => ({
                      ...current,
                      attendance_time: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Room
                </label>
                <input
                  type="text"
                  value={editSubjectData.room}
                  onChange={(event) =>
                    setEditSubjectData((current) => ({
                      ...current,
                      room: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter room"
                />
              </div>

              {editSubjectError && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {editSubjectError}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowEditSubject(false)}
                disabled={isSavingEditSubject}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubject}
                disabled={isSavingEditSubject}
                className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingEditSubject ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default FacultyDashboard;
