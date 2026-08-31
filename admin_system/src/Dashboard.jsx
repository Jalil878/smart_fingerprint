import React from "react";

function Dashboard({ onNavigate, onLogout }) {
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
              className="mt-2 flex items-center px-4 py-2 text-gray-100 bg-gray-700"
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
              type="text"
              placeholder="Search"
            />
          </div>
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Welcome to the Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">Summary of the records.</p>

          <div className="mt-5 grid grid-cols-50 gap-10 sm:grid-cols-2 lg:grid-cols-2">
            <a
              href="#"
              className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <img
                src="/students.png"
                alt="Students"
                className="mx-auto h-10 w-10 object-contain"
              />
              <h5 className="mt-3 text-base font-semibold text-gray-800">
                Student
              </h5>
              <p className="mt-1 text-2xl font-bold text-gray-900">1000</p>
            </a>

            <a
              href="#"
              className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <img
                src="/teacher.png"
                alt="Teacher"
                className="mx-auto h-10 w-10 object-contain"
              />
              <h5 className="mt-3 text-base font-semibold text-gray-800">
                Faculty
              </h5>
              <p className="mt-1 text-2xl font-bold text-gray-900">1000</p>
            </a>

            <a
              href="#"
              className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <img
                src="/devices.png"
                alt="Devices"
                className="mx-auto h-10 w-10 object-contain"
              />
              <h5 className="mt-3 text-base font-semibold text-gray-800">
                Device
              </h5>
              <p className="mt-1 text-2xl font-bold text-gray-900">1000</p>
            </a>

            <a
              href="#"
              className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <img
                src="/subjective.png"
                alt="Devices"
                className="mx-auto h-10 w-10 object-contain"
              />
              <h5 className="mt-3 text-base font-semibold text-gray-800">
                Students Drop
              </h5>
              <p className="mt-1 text-2xl font-bold text-gray-900">1000</p>
            </a>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-gray-200 p-5 text-center">
              <p className="mb-4 text-sm font-medium text-gray-700">
                Create New Student
              </p>
              <a
                href="#"
                className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Add
              </a>
            </div>

            <div className="rounded-md border border-gray-200 p-5 text-center">
              <p className="mb-4 text-sm font-medium text-gray-700">
                Create New Faculty
              </p>
              <a
                href="#"
                className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              >
                Add
              </a>
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
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
