import React, { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

function Faculty({ onNavigate, onLogout }) {
  const [faculty, setFaculty] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFaculty = async () => {
      setErrorMessage("");
      setIsLoading(true);

      if (!isSupabaseConfigured) {
        setErrorMessage("Supabase is not configured. Check admin_system/.env.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("faculty")
        .select(
          "id, first_name, middle_name, last_name, id_number, email, created_at",
        )
        .order("created_at", { ascending: false });

      setIsLoading(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setFaculty(data || []);
    };

    loadFaculty();
  }, []);

  const filteredFaculty = searchTerm.trim()
    ? faculty.filter((member) => {
        const searchableText = [
          member.first_name,
          member.middle_name,
          member.last_name,
          member.id_number,
          member.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(searchTerm.trim().toLowerCase());
      })
    : faculty;

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="hidden w-64 flex-col bg-gray-800 md:flex">
        <div className="flex h-16 items-center justify-center bg-gray-900">
          <span className="font-bold uppercase text-white">Admin</span>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 bg-gray-800 px-2 py-4">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("dashboard");
              }}
              className=" mt-2 flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700"
            >
              <img
                src="/dashboards.png"
                alt="Dashboard"
                className="w-6 h-6 mr-2"
              />
              Dashboard
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("faculty");
              }}
              className="mt-2 flex items-center px-4 py-2 text-gray-100 bg-gray-700"
            >
              <img src="/user.png" alt="User" className="w-6 h-6 mr-2" />
              Manage Faculty
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("student");
              }}
              className="mt-2 flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700"
            >
              <img src="/user.png" alt="User" className="w-6 h-6 mr-2" />
              Manage Student
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("fingerprint");
              }}
              className="mt-2 flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700"
            >
              <img src="/device.png" alt="Device" className="w-6 h-6 mr-2" />
              Manage Fingerprint Devices
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
              className="mt-2 flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700"
            >
              <img src="/logout.png" alt="Log-out" className="w-6 h-6 mr-2" />
              Log-out
            </a>
          </nav>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto ">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white">
          <div className="flex items-center px-4">
            <button className="text-gray-500 focus:text-gray-700 focus:outline-none">
              <img src="/menu.png" alt="menu" className="w-12 h-8" />
            </button>
            <input
              className="mx-4 w-full rounded-md border px-4 py-2"
              type="search"
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Manage Faculty Records
          </h1>
          <p className="mt-1 text-sm text-gray-500">Summary of the records.</p>

          <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm mt-10">
            <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-md border border-gray-400">
              <table className="w-full text-sm text-left rtl:text-right text-body">
                <thead className="text-sm text-body bg-gray-200 border-b rounded-base border-default">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">
                      ID Number
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      First Name
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Last Name
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Middle Name
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Year Level
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Course
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Department
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Edit
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.map((member) => (
                    <tr
                      key={member.id}
                      className="bg-neutral-primary border-b border-default"
                    >
                      <th
                        scope="row"
                        className="px-6 py-4 font-medium text-heading whitespace-nowrap"
                      >
                        {member.id_number}
                      </th>
                      <td className="px-6 py-4">{member.first_name}</td>
                      <td className="px-6 py-4">{member.last_name}</td>
                      <td className="px-6 py-4">
                        {member.middle_name || "-"}
                      </td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4">
                        <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          Approved
                        </span>
                      </td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isLoading && (
              <p className="px-4 py-5 text-sm font-medium text-gray-500">
                Loading approved faculty...
              </p>
            )}
            {!isLoading && faculty.length === 0 && (
              <p className="px-4 py-5 text-sm font-medium text-gray-500">
                No approved faculty yet.
              </p>
            )}
            {!isLoading &&
              faculty.length > 0 &&
              filteredFaculty.length === 0 && (
                <p className="px-4 py-5 text-sm font-medium text-gray-500">
                  No approved faculty match your search.
                </p>
              )}
            {errorMessage && (
              <p className="px-4 py-4 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Faculty;
