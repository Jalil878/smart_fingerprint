import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ManageDevice from "./ManageDevice";
import ManageFaculty from "./ManageFaculty";
import ManageStudent from "./ManageStudent";

const menuItems = [
  "dashboard",
  "manage faculty",
  "manage student",
  "manage fingerprint device",
];

function AdminDashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestModalRole, setRequestModalRole] = useState("student");
  const [approvedCount, setApprovedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadApprovedCount = async () => {
    const [
      { count: studentCount, error: studentError },
      { count: facultyCount, error: facultyError },
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("faculty").select("id", { count: "exact", head: true }),
    ]);

    if (studentError || facultyError) {
      setErrorMessage(studentError?.message || facultyError.message);
      return;
    }

    setApprovedCount((studentCount || 0) + (facultyCount || 0));
  };

  const loadRequests = async () => {
    setErrorMessage("");
    setIsLoading(true);

    const { data, error } = await supabase
      .from("user_pending")
      .select(
        "id, role, first_name, middle_name, last_name, id_number, course, email, status",
      )
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRequests(data || []);
  };

  useEffect(() => {
    loadRequests();
    loadApprovedCount();
  }, []);

  const approveRequest = async (request) => {
    setErrorMessage("");

    const tableName = request.role === "faculty" ? "faculty" : "students";
    const approvedRecord = {
      id: request.id,
      first_name: request.first_name,
      middle_name: request.middle_name,
      last_name: request.last_name,
      id_number: request.id_number,
      email: request.email,
      updated_at: new Date().toISOString(),
    };

    if (request.role === "student") {
      approvedRecord.course = request.course;
    }

    const { error: insertError } = await supabase
      .from(tableName)
      .upsert(approvedRecord, { onConflict: "id" });

    if (insertError) {
      setErrorMessage(insertError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("user_pending")
      .delete()
      .eq("id", request.id);

    if (deleteError) {
      setErrorMessage(deleteError.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.filter(
        (currentRequest) => currentRequest.id !== request.id,
      ),
    );
    setApprovedCount((currentCount) => currentCount + 1);
  };

  const updateStatus = async (id, status) => {
    setErrorMessage("");

    const { error } = await supabase
      .from("user_pending")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  };

  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;
  const rejectedCount = requests.filter(
    (request) => request.status === "rejected",
  ).length;
  const pendingRoleRequests = requests.filter(
    (request) =>
      request.role === requestModalRole && request.status === "pending",
  );
  const roleLabel =
    requestModalRole.charAt(0).toUpperCase() + requestModalRole.slice(1);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredRequests = normalizedSearchTerm
    ? requests.filter((request) => {
        const searchableText = [
          request.first_name,
          request.middle_name,
          request.last_name,
          request.role,
          request.id_number,
          request.course,
          request.email,
          request.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
    : requests;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside className="border-b border-slate-800 bg-slate-950 text-white md:min-h-screen md:w-72 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-sm font-bold text-slate-950">
            SF
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Smart Fingerprint
            </p>
            <h1 className="text-lg font-bold">Admin Panel</h1>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:overflow-visible">
          {menuItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActivePage(item)}
              className={`w-full shrink-0 rounded-md px-3 py-2.5 text-left text-sm font-semibold capitalize transition ${
                activePage === item
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4 md:absolute md:bottom-0 md:w-72 md:pb-5">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </aside>

      <section className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-6xl">
          {activePage === "dashboard" && (
            <>
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Overview
                </p>
                <h2 className="mt-2 text-3xl font-bold">Account Approval</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Total Student
                  </p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {pendingCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Total Faculty
                  </p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {pendingCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Students Dropout
                  </p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {pendingCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Total Fingerprint Devices
                  </p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Pending</p>
                  <p className="mt-3 text-3xl font-bold text-amber-600">
                    {pendingCount}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Approved</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-600">
                    {approvedCount}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border border-gray-200 p-5 text-center">
                  <p className="mb-4 text-sm font-medium text-gray-700">
                    New Student Signup Requests
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestModalRole("student");
                      setIsRequestModalOpen(true);
                    }}
                    className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  >
                    Add
                  </button>
                </div>

                <div className="rounded-md border border-gray-200 p-5 text-center">
                  <p className="mb-4 text-sm font-medium text-gray-700">
                    New Faculty Signup Requests
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestModalRole("faculty");
                      setIsRequestModalOpen(true);
                    }}
                    className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  >
                    Add
                  </button>
                </div>

                <div className="rounded-md border border-gray-200 p-5 text-center">
                  <p className="mb-4 text-sm font-medium text-gray-700">
                    Create New Fingerprint Device
                  </p>
                  <a
                    href="#"
                    className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                  >
                    Add
                  </a>
                </div>
              </div>
              <div className="mt-8 overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">All Signup Requests</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Search by name, role, ID number, email, course, or status.
                    </p>
                  </div>

                  <label className="relative block w-full sm:max-w-xs">
                    <span className="sr-only">Search signup requests</span>
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <svg
                        className="h-4 w-4"
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="m14.5 14.5 3 3M16 8.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </span>
                    <input
                      className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      type="search"
                      placeholder="Search requests"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </label>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Name</th>
                        <th className="px-5 py-3 font-semibold">Role</th>
                        <th className="px-5 py-3 font-semibold">ID Number</th>
                        <th className="px-5 py-3 font-semibold">Email</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRequests.map((request) => {
                        const fullName = [
                          request.first_name,
                          request.middle_name,
                          request.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <tr key={request.id}>
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-950">
                                {fullName}
                              </p>
                              {request.course && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {request.course}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 capitalize">
                              {request.role}
                            </td>
                            <td className="px-5 py-4">{request.id_number}</td>
                            <td className="px-5 py-4">{request.email}</td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${
                                  request.status === "approved"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : request.status === "rejected"
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {request.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => approveRequest(request)}
                                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateStatus(request.id, "rejected")
                                  }
                                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isLoading && (
                  <p className="px-5 py-6 text-sm font-medium text-slate-500">
                    Loading signup requests...
                  </p>
                )}

                {!isLoading && requests.length === 0 && (
                  <p className="px-5 py-6 text-sm font-medium text-slate-500">
                    No signup requests yet.
                  </p>
                )}

                {!isLoading &&
                  requests.length > 0 &&
                  filteredRequests.length === 0 && (
                    <p className="px-5 py-6 text-sm font-medium text-slate-500">
                      No signup requests match your search.
                    </p>
                  )}

                {errorMessage && (
                  <p className="px-5 py-4 text-sm font-medium text-rose-700">
                    {errorMessage}
                  </p>
                )}
              </div>
            </>
          )}

          {activePage === "manage faculty" && <ManageFaculty />}

          {activePage === "manage student" && <ManageStudent />}

          {activePage === "manage fingerprint device" && <ManageDevice />}
        </div>
      </section>

      {isRequestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-requests-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Account approvals
                </p>
                <h3
                  id="signup-requests-title"
                  className="mt-1 text-xl font-bold text-slate-950"
                >
                  New {roleLabel} Signup Requests
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a role, then review pending accounts before approving
                  access.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close signup requests modal"
              >
                X
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                {["student", "faculty"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRequestModalRole(role)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
                      requestModalRole === role
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {pendingRoleRequests.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                  No pending {requestModalRole} signup requests right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingRoleRequests.map((request) => {
                    const fullName = [
                      request.first_name,
                      request.middle_name,
                      request.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <article
                        key={request.id}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-bold text-slate-950">
                              {fullName}
                            </h4>
                            <p className="mt-1 text-sm text-slate-500">
                              {request.role === "student"
                                ? request.course || "No course selected"
                                : "Faculty account"}
                            </p>
                            <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                              <p>ID: {request.id_number}</p>
                              <p>Email: {request.email}</p>
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => approveRequest(request)}
                              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(request.id, "rejected")
                              }
                              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;
