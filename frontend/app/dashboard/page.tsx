import Link from "next/link";

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">
        Welcome to RevClear Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Patients */}
        <Link
          href="/dashboard/patients"
          className="rounded-xl bg-white p-6 shadow border border-slate-200 hover:shadow-md transition block"
        >
          <h2 className="text-xl font-semibold text-slate-900">Patients</h2>
          <p className="text-slate-600 mt-2">
            View and manage patient records.
          </p>
        </Link>

        {/* Encounters */}
        <Link
          href="/dashboard/encounter"
          className="rounded-xl bg-white p-6 shadow border border-slate-200 hover:shadow-md transition block"
        >
          <h2 className="text-xl font-semibold text-slate-900">Encounters</h2>
          <p className="text-slate-600 mt-2">
            Start new SOAP encounters for patients.
          </p>
        </Link>

        {/* Profile */}
        <Link
          href="/dashboard/profile"
          className="rounded-xl bg-white p-6 shadow border border-slate-200 hover:shadow-md transition block"
        >
          <h2 className="text-xl font-semibold text-slate-900">My Profile</h2>
          <p className="text-slate-600 mt-2">
            Account details & settings.
          </p>
        </Link>

      </div>
    </div>
  );
}


