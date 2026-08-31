import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  enrollFingerprint as enrollFingerprintOnDevice,
  verifyFingerprint as verifyFingerprintOnDevice,
  deleteFingerprint as deleteFingerprintOnDevice,
  deleteAllFingerprints as deleteAllFingerprintsOnDevice,
  getStoredUsers,
  pingEsp32,
  setEsp32BaseUrl,
} from "../lib/esp32Api";

function ManageDevice() {
  const [device, setDevice] = useState(null);
  const [totalFaculty, setTotalFaculty] = useState(0);
  const [faculty, setFaculty] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addSearchTerm, setAddSearchTerm] = useState("");
  const [enrollSearchTerm, setEnrollSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState(null);
  const [generatedFingerprintId, setGeneratedFingerprintId] = useState("");
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [verifySearchTerm, setVerifySearchTerm] = useState("");
  const [deleteSearchTerm, setDeleteSearchTerm] = useState("");
  const [verifiedStudentId, setVerifiedStudentId] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [storedFingerprintIds, setStoredFingerprintIds] = useState([]);
  const [isLoadingStoredIds, setIsLoadingStoredIds] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadDeviceData = async () => {
    setErrorMessage("");
    setIsLoading(true);

    const { data: deviceData, error: deviceError } = await supabase
      .from("fingerprint_device")
      .select("id, device_name, device_url")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, count: facultyCount, error } = await supabase
      .from("faculty")
      .select(
        "id, first_name, middle_name, last_name, id_number, status_device, created_at",
        { count: "exact" },
      )
      .eq("status_device", "online")
      .order("created_at", { ascending: false });

    const { data: allData, error: allError } = await supabase
      .from("faculty")
      .select(
        "id, first_name, middle_name, last_name, id_number, status_device",
      )
      .order("last_name", { ascending: true });

    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, first_name, middle_name, last_name, id_number, fingerprint_id")
      .order("last_name", { ascending: true });

    setIsLoading(false);

    if (deviceError || error || allError || studentError) {
      setErrorMessage(
        deviceError?.message ||
          error?.message ||
          allError.message ||
          studentError.message,
      );
      return;
    }

    setDevice(deviceData || null);
    setFaculty(data || []);
    setAllFaculty(allData || []);
    setStudents(studentData || []);
    setTotalFaculty(facultyCount || 0);
  };

  useEffect(() => {
    loadDeviceData();
  }, []);

  const loadStoredFingerprintIds = async () => {
    if (!isDeviceOnline) {
      setStoredFingerprintIds([]);
      return;
    }

    setIsLoadingStoredIds(true);

    try {
      const ids = await getStoredUsers();
      setStoredFingerprintIds(ids.map(Number).sort((a, b) => a - b));
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load IDs";
      setErrorMessage(message);
      setStoredFingerprintIds([]);
    } finally {
      setIsLoadingStoredIds(false);
    }
  };

  useEffect(() => {
    if (isDeviceOnline) {
      loadStoredFingerprintIds();
    }
  }, [isDeviceOnline]);

  useEffect(() => {
    if (!device?.device_url) {
      return;
    }

    setEsp32BaseUrl(device.device_url);

    let cancelled = false;

    const checkHealth = async () => {
      try {
        await pingEsp32();
        if (!cancelled) {
          setIsDeviceOnline(true);
        }
      } catch {
        if (!cancelled) {
          setIsDeviceOnline(false);
        }
      }
    };

    checkHealth();
    const intervalId = setInterval(checkHealth, 15000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [device?.device_url]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredFaculty = normalizedSearchTerm
    ? faculty.filter((member) => {
        const searchableText = [
          member.first_name,
          member.middle_name,
          member.last_name,
          member.id_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
    : faculty;

  const normalizedAddSearchTerm = addSearchTerm.trim().toLowerCase();
  const filteredAllFaculty = normalizedAddSearchTerm
    ? allFaculty.filter((member) => {
        const searchableText = [
          member.first_name,
          member.middle_name,
          member.last_name,
          member.id_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedAddSearchTerm);
      })
    : allFaculty;

  const normalizedEnrollSearchTerm = enrollSearchTerm.trim().toLowerCase();
  const filteredEnrollStudents = normalizedEnrollSearchTerm
    ? students.filter((student) => {
        const searchableText = [
          student.first_name,
          student.middle_name,
          student.last_name,
          student.id_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedEnrollSearchTerm);
      })
    : students;

  const startEnroll = (student) => {
    setErrorMessage("");
    setEnrollingStudent(student);
    setGeneratedFingerprintId(String(Math.floor(Math.random() * 1000) + 1));
  };

  const confirmEnroll = async () => {
    if (!enrollingStudent) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsEnrolling(true);

    try {
      await enrollFingerprintOnDevice(Number(generatedFingerprintId));
    } catch (enrollError) {
      const message =
        enrollError instanceof Error ? enrollError.message : "Enrollment failed";
      setErrorMessage(message);
      setIsEnrolling(false);
      return;
    }

    const { data: updatedRows, error } = await supabase
      .from("students")
      .update({
        fingerprint_id: generatedFingerprintId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollingStudent.id)
      .select("id, fingerprint_id");

    setIsEnrolling(false);

    if (error) {
      setErrorMessage(
        `Fingerprint enrolled on device but failed to save to database: ${error.message}`,
      );
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      setErrorMessage(
        `Fingerprint enrolled on device but no student row matched ID ${enrollingStudent.id}. Nothing was saved.`,
      );
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.map((currentStudent) =>
        currentStudent.id === enrollingStudent.id
          ? { ...currentStudent, fingerprint_id: generatedFingerprintId }
          : currentStudent,
      ),
    );
    setSuccessMessage(
      `Fingerprint ID ${generatedFingerprintId} saved to student record.`,
    );
    setEnrollingStudent(null);
    setGeneratedFingerprintId("");
    loadStoredFingerprintIds();
  };

  const normalizedVerifySearchTerm = verifySearchTerm.trim().toLowerCase();
  const filteredVerifyStudents = normalizedVerifySearchTerm
    ? students.filter((student) => {
        const searchableText = [
          student.first_name,
          student.middle_name,
          student.last_name,
          student.id_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedVerifySearchTerm);
      })
    : students;

  const normalizedDeleteSearchTerm = deleteSearchTerm.trim().toLowerCase();
  const filteredDeleteStudents = normalizedDeleteSearchTerm
    ? students.filter((student) => {
        const searchableText = [
          student.first_name,
          student.middle_name,
          student.last_name,
          student.id_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedDeleteSearchTerm);
      })
    : students;

  const verifyStudent = async (student) => {
    const fullName = [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ");

    setErrorMessage("");
    setSuccessMessage("");
    setIsVerifying(true);

    try {
      const result = await verifyFingerprintOnDevice();
      const matchedId = Number(result?.id);

      if (!matchedId || matchedId !== Number(student.fingerprint_id)) {
        setErrorMessage(
          `No match. Scanned fingerprint ID ${matchedId} does not match ${student.fingerprint_id}.`,
        );
        setIsVerifying(false);
        return;
      }

      setVerifiedStudentId(student.id);
      setSuccessMessage(`Fingerprint verified for ${fullName}.`);
    } catch (verifyError) {
      const message =
        verifyError instanceof Error
          ? verifyError.message
          : "Verification failed";
      setErrorMessage(message);
    }

    setIsVerifying(false);
  };

  const deleteFingerprint = async (student) => {
    const fullName = [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ");

    if (!window.confirm(`Delete fingerprint for ${fullName}?`)) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsDeleting(true);

    try {
      await deleteFingerprintOnDevice(Number(student.fingerprint_id));
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Delete failed";
      setErrorMessage(message);
      setIsDeleting(false);
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ fingerprint_id: null, updated_at: new Date().toISOString() })
      .eq("id", student.id);

    setIsDeleting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStudents((currentStudents) =>
      currentStudents.map((currentStudent) =>
        currentStudent.id === student.id
          ? { ...currentStudent, fingerprint_id: null }
          : currentStudent,
      ),
    );
    setSuccessMessage(`Fingerprint deleted for ${fullName}.`);
    loadStoredFingerprintIds();
  };

  const deleteAllFingerprints = async () => {
    const confirmed = window.confirm(
      "Delete ALL fingerprints from the device? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsDeletingAll(true);

    try {
      await deleteAllFingerprintsOnDevice();
    } catch (deleteAllError) {
      const message =
        deleteAllError instanceof Error
          ? deleteAllError.message
          : "Delete all failed";
      setErrorMessage(message);
      setIsDeletingAll(false);
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ fingerprint_id: null, updated_at: new Date().toISOString() })
      .not("fingerprint_id", "is", null);

    setIsDeletingAll(false);

    if (error) {
      setErrorMessage(error.message);
    }

    setStudents((currentStudents) =>
      currentStudents.map((currentStudent) => ({
        ...currentStudent,
        fingerprint_id: null,
      })),
    );
    setStoredFingerprintIds([]);
    setSuccessMessage("All fingerprints deleted from the device.");
  };

  const addUser = async (member) => {
    setErrorMessage("");

    const { error } = await supabase
      .from("faculty")
      .update({ status_device: "online", updated_at: new Date().toISOString() })
      .eq("id", member.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setFaculty((currentFaculty) => [
      { ...member, status_device: "online" },
      ...currentFaculty,
    ]);
    setAllFaculty((currentAll) =>
      currentAll.map((currentMember) =>
        currentMember.id === member.id
          ? { ...currentMember, status_device: "online" }
          : currentMember,
      ),
    );
    setTotalFaculty((currentTotal) => currentTotal + 1);
    setIsAddModalOpen(false);
  };

  const removeUser = async (member) => {
    const fullName = [member.first_name, member.middle_name, member.last_name]
      .filter(Boolean)
      .join(" ");

    if (!window.confirm(`Remove ${fullName} from the device?`)) {
      return;
    }

    setErrorMessage("");

    const { error } = await supabase
      .from("faculty")
      .update({ status_device: "offline", updated_at: new Date().toISOString() })
      .eq("id", member.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setFaculty((currentFaculty) =>
      currentFaculty.filter((currentMember) => currentMember.id !== member.id),
    );
    setAllFaculty((currentAll) =>
      currentAll.map((currentMember) =>
        currentMember.id === member.id
          ? { ...currentMember, status_device: "offline" }
          : currentMember,
      ),
    );
    setTotalFaculty((currentTotal) => Math.max(currentTotal - 1, 0));
  };

  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Management
      </p>
      <h2 className="mt-2 text-3xl font-bold">Manage Fingerprint Device</h2>

      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Device Information
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Details and status of the connected fingerprint device.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setEnrollSearchTerm("");
                setEnrollingStudent(null);
                setGeneratedFingerprintId("");
                setIsEnrollModalOpen(true);
              }}
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Enroll Fingerprint
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setVerifySearchTerm("");
                setVerifiedStudentId(null);
                setIsVerifyModalOpen(true);
              }}
              className="rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setDeleteSearchTerm("");
                setIsDeleteModalOpen(true);
              }}
              className="rounded-md border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">Device Name</p>
            {isLoading ? (
              <p className="mt-3 text-lg font-bold text-slate-500">
                Loading...
              </p>
            ) : (
              <p className="mt-3 text-lg font-bold text-slate-950">
                {device?.device_name || "No device registered"}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">Device URL</p>
            {isLoading ? (
              <p className="mt-3 text-lg font-bold text-slate-500">
                Loading...
              </p>
            ) : (
              <p className="mt-3 break-all text-lg font-bold text-amber-600">
                {device?.device_url || "No device registered"}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">
              Total Faculty User
            </p>
            {isLoading ? (
              <p className="mt-3 text-lg font-bold text-slate-500">
                Loading...
              </p>
            ) : (
              <p className="mt-3 text-3xl font-bold text-amber-600">
                {totalFaculty}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">Status</p>
            {isLoading ? (
              <p className="mt-3 text-lg font-bold text-slate-500">
                Loading...
              </p>
            ) : (
              <p
                className={`mt-3 text-lg font-bold ${
                  isDeviceOnline ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isDeviceOnline ? "Connected" : "Offline"}
              </p>
            )}
          </div>
        </div>

      </div>

      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Device Users</h3>
            <p className="mt-1 text-sm text-slate-500">
              List of faculty users registered on the device.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search device users</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                type="search"
                placeholder="Search users"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setAddSearchTerm("");
                setIsAddModalOpen(true);
              }}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">ID Number</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredFaculty.map((member) => {
                const fullName = [
                  member.first_name,
                  member.middle_name,
                  member.last_name,
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={member.id}>
                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {fullName}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {member.id_number}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => removeUser(member)}
                        className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            Loading device users...
          </p>
        )}

        {!isLoading && faculty.length === 0 && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            No faculty users registered on the device yet.
          </p>
        )}

        {!isLoading && faculty.length > 0 && filteredFaculty.length === 0 && (
          <p className="px-5 py-6 text-sm font-medium text-slate-500">
            No faculty users match your search.
          </p>
        )}
      </div>

      {/* Fingerprints on Device section (commented out) */}
      {/*
      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Fingerprints on Device
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              All fingerprint IDs currently stored in the scanner.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadStoredFingerprintIds}
              disabled={!isDeviceOnline || isLoadingStoredIds}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={deleteAllFingerprints}
              disabled={!isDeviceOnline || isDeletingAll || storedFingerprintIds.length === 0}
              className="rounded-md border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeletingAll ? "Deleting..." : "Delete All"}
            </button>
          </div>
        </div>

        <div className="p-5">
          {!isDeviceOnline ? (
            <p className="text-sm font-medium text-slate-500">
              Device is offline. Connect the fingerprint device to see stored IDs.
            </p>
          ) : isLoadingStoredIds ? (
            <p className="text-sm font-medium text-slate-500">
              Loading stored fingerprints...
            </p>
          ) : storedFingerprintIds.length === 0 ? (
            <p className="text-sm font-medium text-slate-500">
              No fingerprints stored on the device.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {storedFingerprintIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded-md bg-slate-100 px-3 py-1.5 font-mono text-sm font-semibold text-slate-900"
                >
                  ID {id}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      */}

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 id="add-user-title" className="text-xl font-bold">
                Select Faculty User
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a faculty member to add as a device user.
              </p>
            </div>

            <div className="px-6 py-4">
              <label className="relative block w-full">
                <span className="sr-only">Search faculty</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  type="search"
                  placeholder="Search faculty"
                  value={addSearchTerm}
                  onChange={(event) => setAddSearchTerm(event.target.value)}
                />
              </label>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 pb-5">
              {filteredAllFaculty.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  No faculty found.
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredAllFaculty.map((member) => {
                    const fullName = [
                      member.first_name,
                      member.middle_name,
                      member.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const isEnrolled = member.status_device === "online";

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {fullName}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {member.id_number}
                          </p>
                        </div>

                        {isEnrolled ? (
                          <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addUser(member)}
                            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isEnrollModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enroll-fingerprint-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 id="enroll-fingerprint-title" className="text-xl font-bold">
                Enroll Fingerprint
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {enrollingStudent
                  ? "Confirm the fingerprint ID then start enrolling."
                  : "Select a student to enroll their fingerprint."}
              </p>
              {enrollingStudent && (
                <p className="mt-2 text-xs font-medium text-slate-500">
                  After clicking Start Enroll, place the same finger twice on the sensor.
                </p>
              )}
            </div>

            {errorMessage && (
              <p className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </p>
            )}

            {enrollingStudent ? (
              <>
                <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {[
                            enrollingStudent.first_name,
                            enrollingStudent.middle_name,
                            enrollingStudent.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {enrollingStudent.id_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-500">
                      Generated Fingerprint ID
                    </p>
                    <p className="mt-1 break-all font-mono text-lg font-bold text-amber-600">
                      {generatedFingerprintId}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollingStudent(null);
                      setGeneratedFingerprintId("");
                    }}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={confirmEnroll}
                    disabled={isEnrolling}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEnrolling ? "Enrolling..." : "Start Enroll"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-4">
                  <label className="relative block w-full">
                    <span className="sr-only">Search students</span>
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      type="search"
                      placeholder="Search name or student ID"
                      value={enrollSearchTerm}
                      onChange={(event) => setEnrollSearchTerm(event.target.value)}
                    />
                  </label>
                </div>

                <div className="max-h-[50vh] overflow-y-auto px-6 pb-5">
                  {filteredEnrollStudents.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                      No students found.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {filteredEnrollStudents.map((student) => {
                        const fullName = [
                          student.first_name,
                          student.middle_name,
                          student.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        const hasFingerprint = Boolean(student.fingerprint_id);

                        return (
                          <div
                            key={student.id}
                            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-950">
                                {fullName}
                              </p>
                              <p className="mt-0.5 text-sm text-slate-500">
                                {student.id_number}
                              </p>
                            </div>

                            {hasFingerprint ? (
                              <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Enrolled
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEnroll(student)}
                                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                Enroll
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isVerifyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-fingerprint-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 id="verify-fingerprint-title" className="text-xl font-bold">
                Verify Fingerprint
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a student to verify their fingerprint.
              </p>
            </div>

            {errorMessage && (
              <p className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </p>
            )}

            <div className="px-6 py-4">
              <label className="relative block w-full">
                <span className="sr-only">Search students</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  type="search"
                  placeholder="Search name or student ID"
                  value={verifySearchTerm}
                  onChange={(event) => setVerifySearchTerm(event.target.value)}
                />
              </label>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 pb-5">
              {filteredVerifyStudents.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  No students found.
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredVerifyStudents.map((student) => {
                    const fullName = [
                      student.first_name,
                      student.middle_name,
                      student.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const hasFingerprint = Boolean(student.fingerprint_id);

                    return (
                      <div
                        key={student.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {fullName}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {student.id_number}
                          </p>
                          {hasFingerprint && (
                            <p className="mt-0.5 break-all font-mono text-xs text-amber-600">
                              ID: {student.fingerprint_id}
                            </p>
                          )}
                        </div>

                        {!hasFingerprint ? (
                          <span className="inline-flex w-fit rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            No fingerprint
                          </span>
                        ) : verifiedStudentId === student.id ? (
                          <span className="inline-flex w-fit rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => verifyStudent(student)}
                            disabled={isVerifying}
                            className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isVerifying ? "Verifying..." : "Verify"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-fingerprint-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 id="delete-fingerprint-title" className="text-xl font-bold">
                Delete Fingerprint
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a student to delete their fingerprint.
              </p>
            </div>

            {errorMessage && (
              <p className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-medium text-rose-700">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </p>
            )}

            <div className="px-6 py-4">
              <label className="relative block w-full">
                <span className="sr-only">Search students</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  type="search"
                  placeholder="Search name or student ID"
                  value={deleteSearchTerm}
                  onChange={(event) => setDeleteSearchTerm(event.target.value)}
                />
              </label>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-6 pb-5">
              {filteredDeleteStudents.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  No students found.
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredDeleteStudents.map((student) => {
                    const fullName = [
                      student.first_name,
                      student.middle_name,
                      student.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const hasFingerprint = Boolean(student.fingerprint_id);

                    return (
                      <div
                        key={student.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">
                            {fullName}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {student.id_number}
                          </p>
                          {hasFingerprint && (
                            <p className="mt-0.5 break-all font-mono text-xs text-amber-600">
                              ID: {student.fingerprint_id}
                            </p>
                          )}
                        </div>

                        {!hasFingerprint ? (
                          <span className="inline-flex w-fit rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            No fingerprint
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => deleteFingerprint(student)}
                            disabled={isDeleting}
                            className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ManageDevice;
