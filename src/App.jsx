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

  const handleSignIn = (role = "admin", profile = null) => {
    setUserRole(role);
    setUserProfile(profile);
    setIsSignedIn(true);
  };

  const handleLogout = () => {
    setIsSignedIn(false);
    setAuthView("login");
    setUserProfile(null);
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

  if (userRole === "faculty") {
    return <FacultyDashboard profile={userProfile} onLogout={handleLogout} />;
  }

  if (userRole === "student") {
    return <StudentDashboard profile={userProfile} onLogout={handleLogout} />;
  }

  if (userRole === "admin") {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
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
            onClick={handleLogout}
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
}

export default App;
