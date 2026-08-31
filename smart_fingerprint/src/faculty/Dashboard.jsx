import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { stopScanning } from "../lib/esp32Api";
import CreateAttendance from "./CreateAttendance";
import DayAttendance from "./DayAttendance";
import StatusAttendance from "./StatusAttendance";
import MyProfile from "./MyProfile";
import ListStudent from "./ListStudent";
import EditSubject from "./EditSubject";

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

      const sessions = data || [];

      if (sessions.length === 0) {
        setAttendanceSessions([]);
        return;
      }

      const sessionIds = sessions.map((item) => item.id).filter(Boolean);
      const shouldLoadMetadata = sessions.some(
        (item) =>
          item.course_code === undefined ||
          item.semester === undefined ||
          item.academic_year === undefined,
      );

      if (!shouldLoadMetadata || sessionIds.length === 0) {
        setAttendanceSessions(sessions);
        return;
      }

      const { data: sessionMetadata, error: metadataError } = await supabase
        .from("attendance_sessions")
        .select("id, course_code, semester, academic_year")
        .in("id", sessionIds);

      if (metadataError || !sessionMetadata) {
        setAttendanceSessions(sessions);
        return;
      }

      const metadataById = Object.fromEntries(
        sessionMetadata.map((item) => [item.id, item]),
      );

      setAttendanceSessions(
        sessions.map((item) => ({
          ...item,
          ...metadataById[item.id],
        })),
      );
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
  const scanMessageTimeout = useRef(null);
  const showScanMessage = (message) => {
    setScanMessage(message);
    if (scanMessageTimeout.current) {
      clearTimeout(scanMessageTimeout.current);
    }
    scanMessageTimeout.current = setTimeout(() => {
      setScanMessage("");
    }, 5000);
  };
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
  const [editSubjectData, setEditSubjectData] = useState({
    subject_name: "",
    section: "",
    course_code: "",
    semester: "",
    academic_year: "",
    start_academic_year: "",
    end_academic_year: "",
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

    setActivePage("list students");
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

    const academicYearValue = selectedAttendance.academic_year || "";
    const [startAcademicYear = "", endAcademicYear = ""] = academicYearValue
      .split("-")
      .map((value) => value.trim());

    setEditSubjectData({
      subject_name: selectedAttendance.subject_name,
      section: selectedAttendance.section,
      course_code: selectedAttendance.course_code || "",
      semester: selectedAttendance.semester || "",
      academic_year: academicYearValue,
      start_academic_year: startAcademicYear,
      end_academic_year: endAcademicYear,
      attendance_time: selectedAttendance.attendance_time,
      room: selectedAttendance.room || "",
    });
    setEditSubjectError("");
    setActivePage("edit subject");
  };

  const handleEditSubject = async () => {
    if (!selectedAttendance) return;

    const subjectName = editSubjectData.subject_name.trim();
    const section = editSubjectData.section.trim();
    const courseCode = editSubjectData.course_code.trim();
    const semester = editSubjectData.semester.trim();
    const startAcademicYear = editSubjectData.start_academic_year.trim();
    const endAcademicYear = editSubjectData.end_academic_year.trim();
    const attendanceTime = editSubjectData.attendance_time;
    const academicYear = `${startAcademicYear}-${endAcademicYear}`;

    if (!subjectName) {
      setEditSubjectError("Please enter the subject name.");
      return;
    }

    if (!section) {
      setEditSubjectError("Please enter the section.");
      return;
    }

    if (!semester) {
      setEditSubjectError("Please enter the semester.");
      return;
    }

    if (!startAcademicYear) {
      setEditSubjectError("Please enter the start year.");
      return;
    }

    if (!endAcademicYear) {
      setEditSubjectError("Please enter the end year.");
      return;
    }

    if (Number(endAcademicYear) <= Number(startAcademicYear)) {
      setEditSubjectError("End year must be greater than start year.");
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
      p_course_code: courseCode || null,
      p_semester: semester,
      p_academic_year: academicYear,
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
      course_code: courseCode,
      semester: semester,
      academic_year: academicYear,
      attendance_time: attendanceTime,
      room: editSubjectData.room.trim() || null,
    };

    setSelectedAttendance(updatedAttendance);
    setAttendanceSessions((current) =>
      current.map((item) =>
        item.id === updatedAttendance.id ? updatedAttendance : item
      )
    );
    setActivePage("day attendance");
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
                        {item.course_code
                          ? `${item.course_code} - ${item.subject_name}`
                          : item.subject_name}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.section} - {formatTime(item.attendance_time)}
                        {item.room ? ` - ${item.room}` : ""}
                      </p>
                      {(item.semester || item.academic_year) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.semester || ""}
                          {item.semester && item.academic_year ? " - " : ""}
                          {item.academic_year || ""}
                        </p>
                      )}
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
            onScanMessage={showScanMessage}
            onStopScanning={() => {
              stopScanning();
              setIsScanning(false);
            }}
          />
        )}

        {activePage === "list students" && selectedAttendance && (
          <ListStudent
            attendance={selectedAttendance}
            onBack={handleBackToDayAttendance}
            sessionStudents={sessionStudents}
            onAddStudents={openAddStudents}
            onRemoveStudent={closeAddStudents}
            isAllStudentsLoading={isAllStudentsLoading}
            allStudentsError={allStudentsError}
            addStudentsSearchTerm={addStudentsSearchTerm}
            setAddStudentsSearchTerm={setAddStudentsSearchTerm}
            selectedAddStudentIds={selectedAddStudentIds}
            isAddingStudents={isAddingStudents}
            handleAddStudents={handleAddStudents}
            toggleAddStudent={toggleAddStudent}
            filteredAddStudents={filteredAddStudents}
            showAddStudents={showAddStudents}
          />
        )}

        {activePage === "edit subject" && selectedAttendance && (
          <EditSubject
            attendance={selectedAttendance}
            onBack={handleBackToDayAttendance}
            editSubjectData={editSubjectData}
            setEditSubjectData={setEditSubjectData}
            editSubjectError={editSubjectError}
            isSavingEditSubject={isSavingEditSubject}
            handleEditSubject={handleEditSubject}
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

      {activePage !== "list students" && activePage !== "edit subject" && (
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
            : activePage === "day attendance" ||
              activePage === "list students" ||
              activePage === "edit subject"
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
              ]
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (
                  activePage === "day attendance" ||
                  activePage === "list students" ||
                  activePage === "edit subject"
                ) {
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
                    showScanMessage("Starting fingerprint attendance...");
                    setIsScanning(true);
                  } else if (key === "stop") {
                    stopScanning();
                    setIsScanning(false);
                    showScanMessage("Fingerprint attendance stopped.");
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
      )}

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
    </main>
  );
}

export default FacultyDashboard;
