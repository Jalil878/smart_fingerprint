import React from "react";

function Fingerprint({ onNavigate, onLogout }) {
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
              className="mt-2 flex items-center px-4 py-2 text-gray-100 hover:bg-gray-700"
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
              className="mt-2 flex items-center px-4 py-2 text-gray-100 bg-gray-700"
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
              type="text"
              placeholder="Search"
            />
          </div>
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Manage Fingerprint Device Records
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
                  <tr className="bg-neutral-primary border-b border-default">
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-heading whitespace-nowrap"
                    >
                      1
                    </th>
                    <td className="px-6 py-4">John</td>
                    <td className="px-6 py-4">Doe</td>
                    <td className="px-6 py-4">Jane</td>
                    <td className="px-6 py-4">1st</td>
                    <td className="px-6 py-4">Computer Science</td>
                    <td className="px-6 py-4">College of Engineering</td>
                  </tr>
                  <tr className="bg-neutral-primary border-b border-default">
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-heading whitespace-nowrap"
                    >
                      2
                    </th>
                    <td className="px-6 py-4">Lebron</td>
                    <td className="px-6 py-4">James PC</td>
                    <td className="px-6 py-4">John</td>
                    <td className="px-6 py-4">3rd</td>
                    <td className="px-6 py-4">Information Technology</td>
                    <td className="px-6 py-4">College of Engineering</td>
                  </tr>
                  <tr className="bg-neutral-primary">
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-heading whitespace-nowrap"
                    >
                      3
                    </th>
                    <td className="px-6 py-4">Michael</td>
                    <td className="px-6 py-4">Jordan</td>
                    <td className="px-6 py-4">Mike</td>
                    <td className="px-6 py-4">1st</td>
                    <td className="px-6 py-4">Computer Science</td>
                    <td className="px-6 py-4">College of Engineering</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Fingerprint;
