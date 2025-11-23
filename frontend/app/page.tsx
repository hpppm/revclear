export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome to RevClear</h1>

        <p className="mt-4 text-slate-600">
          Please log in or create an account.
        </p>

        <div className="mt-6 flex gap-4 justify-center">
          <a
            href="/login"
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Login
          </a>

          <a
            href="/signup"
            className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
