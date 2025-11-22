export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">RevClear</h1>
      
      <p className="text-lg text-slate-600 mb-8 text-center max-w-md">
        AI-powered medical billing and SOAP automation for outpatient clinics.
      </p>

      <div className="flex gap-4">
        <a
          href="/signup"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white shadow hover:bg-blue-700 transition"
        >
          Create Account
        </a>

        <a
          href="/login"
          className="rounded-lg border border-blue-600 px-6 py-3 text-blue-600 shadow hover:bg-blue-50 transition"
        >
          Login
        </a>
      </div>
    </div>
  );
}
