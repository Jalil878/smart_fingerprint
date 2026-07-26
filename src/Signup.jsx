import { useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const courses = [
  "BS-Information Technology",
  "BS-Civil Engineering",
  "BS-Electrical Engineering",
  "BS-Social Work",
  "BS-Nursing",
  "BS-Accountancy",
  "BS-Criminology",
  "BEED-General Education",
];

function Signup({ onShowLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedRole) {
      setErrorMessage("Please select a role first.");
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage("Add your Supabase URL and anon key to .env first.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");
    const profile = {
      role: selectedRole,
      first_name: formData.get("firstName"),
      middle_name: formData.get("middleName"),
      last_name: formData.get("lastName"),
      id_number: formData.get("idNumber"),
      course: selectedRole === "student" ? formData.get("course") : "",
      status: "pending",
    };

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profile,
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const { error: pendingError } = await supabase.from("user_pending").insert({
      id: data.user.id,
      role: profile.role,
      first_name: profile.first_name,
      middle_name: profile.middle_name,
      last_name: profile.last_name,
      id_number: profile.id_number,
      course: profile.course,
      email,
      status: profile.status,
    });

    if (pendingError) {
      setErrorMessage(pendingError.message);
      return;
    }

    setSuccessMessage("Account created. Please wait for admin approval.");
    event.currentTarget.reset();
    onShowLogin();
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-10">
        <section className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="p-8 sm:p-10">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Get started
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Sign up
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="middleName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Middle name
                  </label>
                  <input
                    id="middleName"
                    name="middleName"
                    type="text"
                    autoComplete="additional-name"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter middle name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="idNumber"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    ID Number
                  </label>
                  <input
                    id="idNumber"
                    name="idNumber"
                    type="text"
                    autoComplete="number"
                    required
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter ID number"
                  />
                </div>
              </div>

              {selectedRole === "student" && (
                <div>
                  <label
                    htmlFor="course"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Course
                  </label>
                  <select
                    id="course"
                    name="course"
                    required
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select course
                    </option>
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
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

              <div>
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
                    autoComplete="new-password"
                    required
                    className="block w-full rounded-md border border-slate-300 px-3 py-2.5 pr-16 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    placeholder="Create password"
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

              {errorMessage && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"

              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onShowLogin}
                className="font-semibold text-slate-900 hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Signup;
