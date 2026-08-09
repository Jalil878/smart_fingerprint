import { useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

function Login({ onSignIn, onShowSignup }) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!isSupabaseConfigured) {
      setErrorMessage("Add your Supabase URL and anon key to .env first.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const profile = data.user?.user_metadata || {};

    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("name, email, role")
      .eq("email", data.user.email)
      .maybeSingle();

    if (admin) {
      onSignIn("admin", {
        ...profile,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      });
      return;
    }

    if (!selectedRole) {
      setErrorMessage("Please select a role first.");
      await supabase.auth.signOut();
      return;
    }

    const approvedTable = selectedRole === "faculty" ? "faculty" : "students";
    const approvedColumns =
      selectedRole === "faculty"
        ? "first_name, middle_name, last_name, id_number, email"
        : "first_name, middle_name, last_name, id_number, course, fingerprint_id, email";

    const { data: approvedUser, error: approvedError } = await supabase
      .from(approvedTable)
      .select(approvedColumns)
      .eq("id", data.user.id)
      .maybeSingle();

    if (approvedError) {
      setErrorMessage(approvedError.message);
      await supabase.auth.signOut();
      return;
    }

    if (approvedUser) {
      onSignIn(selectedRole, {
        ...profile,
        ...approvedUser,
        role: selectedRole,
      });
      return;
    }

    const { data: pendingUser, error: pendingError } = await supabase
      .from("user_pending")
      .select("role, status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (pendingError) {
      setErrorMessage(pendingError.message);
      await supabase.auth.signOut();
      return;
    }

    if (pendingUser?.role && pendingUser.role !== selectedRole) {
      setErrorMessage(`This account is registered as ${pendingUser.role}.`);
      await supabase.auth.signOut();
      return;
    }

    if (pendingUser?.status === "rejected") {
      setErrorMessage("Your account request was rejected.");
      await supabase.auth.signOut();
      return;
    }

    setErrorMessage("Your account is waiting for admin approval.");
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen animate-fade-in bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-10">
        <section className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="p-7 sm:p-9">
            <div className="mb-8">
              <div className="mb-6 flex animate-fade-in-up items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-900 text-lg font-bold text-white">
                  SF
                </div>
                <img
                  src="peaci.png"
                  alt="Peaci Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>
              <h1 className="animate-fade-in-up text-2xl font-bold leading-tight sm:text-xl" style={{ animationDelay: '0.1s' }}>
                Smart Fingerprint: Subject Attendance
              </h1>
              <h2 className="mt-2 animate-fade-in-up text-xl font-bold text-slate-950" style={{ animationDelay: '0.15s' }}>Sign in</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {errorMessage}
                </p>
              )}

              <div className="animate-stagger grid grid-cols-2 gap-2">
                {["faculty", "student"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold capitalize transition ${
                      selectedRole === role
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div style={{ animation: 'fade-in-up 0.5s ease-out 0.25s both' }}>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter email"
                />
              </div>

              <div style={{ animation: 'fade-in-up 0.5s ease-out 0.35s both' }}>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 pr-16 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-slate-500 hover:text-slate-900"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm" style={{ animation: 'fade-in-up 0.5s ease-out 0.45s both' }}>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="font-medium text-slate-700 hover:text-slate-950"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                style={{ animation: 'fade-in-up 0.5s ease-out 0.55s both' }}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 animate-fade-in-up text-center text-sm text-slate-600" style={{ animationDelay: '0.65s' }}>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onShowSignup}
                className="font-semibold text-slate-900 hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
