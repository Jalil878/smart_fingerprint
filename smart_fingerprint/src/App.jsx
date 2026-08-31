import { useState } from "react";
import Login from "./Login";
import Signup from "./Signup";
import AdminDashboard from "./admin/Dashboard";
import FacultyDashboard from "./faculty/Dashboard";
import StudentDashboard from "./student/Dashboard";

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authView, setAuthView] = useState("login");
  const [userRole, setUserRole] = useState("admin");
  const [userProfile, setUserProfile] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleSignIn = (role = "admin", profile = null) => {
    setUserRole(role);
    setUserProfile(profile);
    setIsSignedIn(true);
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    setIsSignedIn(false);
    setAuthView("login");
    setUserProfile(null);
  };

  const renderDashboard = () => {
    const dashboards = {
      faculty: <FacultyDashboard profile={userProfile} onLogout={() => setShowLogoutModal(true)} onProfileUpdate={setUserProfile} />,
      student: <StudentDashboard profile={userProfile} onLogout={() => setShowLogoutModal(true)} onProfileUpdate={setUserProfile} />,
      admin: <AdminDashboard onLogout={() => setShowLogoutModal(true)} />,
    };

    return dashboards[userRole] || (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-lg bg-white p-8 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Smart Fingerprint
              </p>
              <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
          <p className="mt-6 text-slate-600">
            You are signed in. Add your dashboard pages here next.
          </p>
        </div>
      </main>
    );
  };

  if (!isSignedIn) {
    if (authView === "signup") {
      return (
        <Signup
          onShowLogin={() => setAuthView("login")}
        />
      );
    }

    return (
      <Login
        onSignIn={handleSignIn}
        onShowSignup={() => setAuthView("signup")}
      />
    );
  }

  return (
    <>
      {renderDashboard()}

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="px-6 py-5">
              <h3 className="text-xl font-bold text-slate-950">Logout</h3>
              <p className="mt-1 text-sm text-slate-500">Are you sure you want to log out?</p>
            </div>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
