import Login from "./Login";
import Dashboard from "./Dashboard";
import Student from "./Student";
import Faculty from "./Faculty";
import Fingerprint from "./Fingerprint";
import { useState } from "react";
import { supabase } from "./supabaseClient";

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [page, setPage] = useState("dashboard");

  const handleSignIn = () => {
    setIsSignedIn(true);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    setIsSignedIn(false);
    setPage("dashboard");
  };

  if (!isSignedIn) {
    return <Login onSignIn={handleSignIn} />;
  }

  if (page === "faculty") {
    return <Faculty onNavigate={setPage} onLogout={handleLogout} />;
  }

  if (page === "student") {
    return <Student onNavigate={setPage} onLogout={handleLogout} />;
  }

  if (page === "fingerprint") {
    return <Fingerprint onNavigate={setPage} onLogout={handleLogout} />;
  }

  return <Dashboard onNavigate={setPage} onLogout={handleLogout} />;
}

export default App;
