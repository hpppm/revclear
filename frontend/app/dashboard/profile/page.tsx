"use client";

import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Format the creation date
    const createdDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "N/A";

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-600 mt-2">
                        View and manage your account information
                    </p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                        <div className="flex items-center">
                            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 text-3xl font-bold">
                                {user.full_name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="ml-6 text-white">
                                <h2 className="text-2xl font-bold">{user.full_name}</h2>
                                <p className="text-blue-100 capitalize">{user.role || "User"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Information Section */}
                    <div className="px-8 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">
                                    Email Address
                                </label>
                                <p className="text-slate-900 font-medium">{user.email}</p>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">
                                    Role
                                </label>
                                <p className="text-slate-900 font-medium capitalize">
                                    {user.role || "Clinician"}
                                </p>
                            </div>

                            {/* Practitioner Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">
                                    Practitioner Type
                                </label>
                                <p className="text-slate-900 font-medium">
                                    {(user as any).practitioner_type || "Not specified"}
                                </p>
                            </div>

                            {/* License ID */}
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">
                                    License / Certification ID
                                </label>
                                <p className="text-slate-900 font-medium">
                                    {(user as any).license_id || "Not specified"}
                                </p>
                            </div>

                            {/* Account Created */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-500 mb-1">
                                    Account Created
                                </label>
                                <p className="text-slate-900 font-medium">{createdDate}</p>
                            </div>
                        </div>
                    </div>
                    {/* Cognito ID (for debugging) */}
                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 flex items-center">
                                <svg
                                    className="w-4 h-4 mr-2 transform group-open:rotate-90 transition-transform"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                                Advanced Information
                            </summary>
                            <div className="mt-3 pl-6">
                                <label className="block text-sm font-medium text-slate-500 mb-1">
                                    Cognito ID
                                </label>
                                <p className="text-slate-900 font-mono text-xs break-all bg-slate-50 p-3 rounded border border-slate-200">
                                    {user.cognito_id || "N/A"}
                                </p>
                            </div>
                        </details>
                    </div>

                    {/* Actions Section */}
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleLogout}
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                            >
                                Logout
                            </button>
                            <button
                                disabled
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-200 text-slate-400 font-semibold rounded-lg cursor-not-allowed"
                                title="Coming soon"
                            >
                                Edit Profile
                            </button>
                            <button
                                disabled
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-200 text-slate-400 font-semibold rounded-lg cursor-not-allowed"
                                title="Coming soon"
                            >
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                {/* Additional Info Card */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <svg
                            className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <div>
                            <h3 className="font-semibold text-blue-900 mb-1">
                                Profile Management
                            </h3>
                            <p className="text-sm text-blue-800">
                                Profile editing and password change features are coming soon. For
                                now, you can view your account information and logout from this
                                page.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
