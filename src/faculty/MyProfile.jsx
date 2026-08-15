import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { pingEsp32, setEsp32BaseUrl } from "../lib/esp32Api";

function MyProfile({ profile, onProfileUpdate }) {
  const fullName =
    [profile?.first_name, profile?.middle_name, profile?.last_name]
      .filter(Boolean)
      .join(" ") || "Faculty";

  const [statusDevice, setStatusDevice] = useState(
    profile?.status_device || "offline",
  );
  const [device, setDevice] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState("loading");
  const [deviceChecked, setDeviceChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      const { data: statusData, error: statusError } = await supabase
        .from("faculty")
        .select("status_device")
        .eq("id", profile?.id ?? "")
        .maybeSingle();

      if (!cancelled && !statusError && statusData?.status_device) {
        setStatusDevice(statusData.status_device);
      }

      const { data: deviceData, error: deviceError } = await supabase.rpc(
        "get_fingerprint_device",
      );

      if (cancelled) {
        return;
      }

      const deviceRow = deviceData?.[0] ?? null;

      if (deviceError || !deviceRow?.device_url) {
        setDevice(deviceRow);
        setDeviceStatus("none");
        setDeviceChecked(true);
        return;
      }

      setDevice(deviceRow);
      setEsp32BaseUrl(deviceRow.device_url);

      let status = "offline";
      try {
        await pingEsp32();
        status = "online";
      } catch {
        status = "offline";
      }

      if (!cancelled) {
        setDeviceStatus(status);
        setDeviceChecked(true);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    id_number: "",
  });
  const [editProfileError, setEditProfileError] = useState("");
  const [editProfileMessage, setEditProfileMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openChangePassword = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordMessage("");
    setShowChangePassword(true);
  };

  const openEditProfile = () => {
    setEditProfileData({
      first_name: profile?.first_name || "",
      middle_name: profile?.middle_name || "",
      last_name: profile?.last_name || "",
      id_number: profile?.id_number != null ? String(profile.id_number) : "",
    });
    setEditProfileError("");
    setEditProfileMessage("");
    setShowEditProfile(true);
  };

  const handleEditProfile = async () => {
    setEditProfileError("");
    setEditProfileMessage("");

    const firstName = editProfileData.first_name.trim();
    const lastName = editProfileData.last_name.trim();
    const idNumber = String(editProfileData.id_number ?? "").trim();

    if (!firstName) {
      setEditProfileError("Please enter the first name.");
      return;
    }

    if (!lastName) {
      setEditProfileError("Please enter the last name.");
      return;
    }

    if (!idNumber) {
      setEditProfileError("Please enter the ID number.");
      return;
    }

    setIsSavingProfile(true);

    try {
      const { error } = await supabase.rpc("update_faculty_profile", {
        p_first_name: firstName,
        p_middle_name: editProfileData.middle_name.trim() || null,
        p_last_name: lastName,
        p_id_number: idNumber,
      });

      if (error) {
        setEditProfileError(error.message);
        return;
      }

      setEditProfileMessage("Profile updated successfully.");
      setShowEditProfile(false);
      onProfileUpdate?.({
        ...profile,
        first_name: editProfileData.first_name.trim(),
        middle_name: editProfileData.middle_name.trim() || null,
        last_name: editProfileData.last_name.trim(),
        id_number: editProfileData.id_number.trim(),
      });
    } catch (err) {
      setEditProfileError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordMessage("");

    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPasswordMessage("Password changed successfully.");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Account Details
        </p>
        <h2 className="mt-2 text-3xl font-bold">My Profile</h2>
        <p className="mt-1 text-slate-500">
          Your faculty account information.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
            {fullName
              .split(" ")
              .map((part) => part[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase() || "SF"}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-950">{fullName}</p>
            <p className="text-sm text-slate-500">Faculty</p>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          <div className="grid gap-1 px-6 py-4 sm:grid-cols-[180px_1fr]">
            <p className="text-sm font-semibold text-slate-500">ID Number</p>
            <p className="text-sm font-semibold text-slate-950">{profile?.id_number}</p>
          </div>
          <div className="grid gap-1 px-6 py-4 sm:grid-cols-[180px_1fr]">
            <p className="text-sm font-semibold text-slate-500">Email</p>
            <p className="text-sm font-semibold text-slate-950">{profile?.email}</p>
          </div>
          <div className="grid gap-1 px-6 py-4 sm:grid-cols-[180px_1fr]">
            <p className="text-sm font-semibold text-slate-500">Role</p>
            <p className="text-sm font-semibold capitalize text-slate-950">
              {profile?.role || "faculty"}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Fingerprint Device
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                statusDevice === "online"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  statusDevice === "online"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
              {statusDevice === "online" ? "Enrolled" : "Not Enrolled"}
            </span>
          </div>

          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <p className="text-sm font-semibold text-slate-500">Device Name</p>
            <p className="text-sm font-semibold text-slate-950">
              {device?.device_name || "\u2014"}
            </p>
          </div>

          <div className="mt-3 grid gap-1 sm:grid-cols-[180px_1fr]">
            <p className="text-sm font-semibold text-slate-500">Device URL</p>
            <p className="break-all font-mono text-sm text-slate-950">
              {device?.device_url || "\u2014"}
            </p>
          </div>

          <div className="mt-3 grid gap-1 sm:grid-cols-[180px_1fr]">
            <p className="text-sm font-semibold text-slate-500">Device Status</p>
            <p
              className={`text-sm font-semibold ${
                deviceStatus === "online"
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {deviceStatus === "online"
                ? "Connected"
                : deviceStatus === "offline"
                  ? "Offline"
                    : deviceStatus === "loading"
                    ? "Checking\u2026"
                    : "Offline"}
            </p>
          </div>

          {deviceChecked && (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {statusDevice === "online"
                ? deviceStatus === "online"
                  ? "Your fingerprint is enrolled on the device and the device is connected. You can use fingerprint scanning to record attendance."
                  : "Your fingerprint is enrolled on the device, but the device is currently offline. You cannot use fingerprint scanning while it is offline."
                : "Your fingerprint is not enrolled on the device. You cannot use fingerprint scanning; record attendance manually instead."}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={openChangePassword}
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Change Password
          </button>
        </div>
      </div>

      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-950">Change Password</h3>
              <p className="mt-1 text-sm text-slate-500">
                Enter your new password below.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {passwordError && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {passwordError}
                </p>
              )}

              {passwordMessage && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {passwordMessage}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                disabled={isSavingPassword}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={isSavingPassword}
                className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingPassword ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-950">Edit Profile</h3>
              <p className="mt-1 text-sm text-slate-500">
                Update your account information.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  First name
                </label>
                <input
                  type="text"
                  value={editProfileData.first_name}
                  onChange={(event) =>
                    setEditProfileData((current) => ({
                      ...current,
                      first_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Middle name
                </label>
                <input
                  type="text"
                  value={editProfileData.middle_name}
                  onChange={(event) =>
                    setEditProfileData((current) => ({
                      ...current,
                      middle_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Last name
                </label>
                <input
                  type="text"
                  value={editProfileData.last_name}
                  onChange={(event) =>
                    setEditProfileData((current) => ({
                      ...current,
                      last_name: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  ID number
                </label>
                <input
                  type="text"
                  value={editProfileData.id_number}
                  onChange={(event) =>
                    setEditProfileData((current) => ({
                      ...current,
                      id_number: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {editProfileError && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {editProfileError}
                </p>
              )}

              {editProfileMessage && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {editProfileMessage}
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                disabled={isSavingProfile}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditProfile}
                disabled={isSavingProfile}
                className="flex-1 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyProfile;