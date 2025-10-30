"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();
  return (
    <main className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-3xl font-bold">AI Medical Billing System</h1>
      {user ? (
        <p className="mt-4">Welcome, {user.email}</p>
      ) : (
        <>
          <p className="mt-4 text-gray-400">Sign in to start managing encounters.</p>
          <Link
            href="/login"
            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Go to Login
          </Link>
        </>
      )}
    </main>
  );
}
