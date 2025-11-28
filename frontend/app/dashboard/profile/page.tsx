"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";

export default function ProfilePage() {
    const { user, logout, checkAuth } = useAuth();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        phone: (user as any)?.phone || "",
        practitioner_type: (user as any)?.practitioner_type || "",
        license_id: (user as any)?.license_id || "",
        license_state: (user as any)?.license_state || "",
        npi: (user as any)?.npi || "",
        taxonomy_code: (user as any)?.taxonomy_code || "",
    });
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                phone: (user as any)?.phone || "",
                practitioner_type: (user as any)?.practitioner_type || "",
                license_id: (user as any)?.license_id || "",
                license_state: (user as any)?.license_state || "",
                npi: (user as any)?.npi || "",
                taxonomy_code: (user as any)?.taxonomy_code || "",
            });
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload = {
                phone: formData.phone,
                practitioner_type: formData.practitioner_type,
                license_id: formData.license_id,
                license_state: formData.license_state,
                npi: formData.npi,
                taxonomy_code: formData.taxonomy_code,
            };

            // Strip empty strings
            const cleanUserPayload = Object.entries(payload).reduce((acc, [key, value]) => {
                if (typeof value === "string") {
                    const trimmed = value.trim();
                    if (trimmed !== "") acc[key] = trimmed;
                } else if (value !== undefined) {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, any>);

            // Update user profile
            await apiClient.me.updateProfile(cleanUserPayload);

            // Refresh auth to get updated data
            await checkAuth();
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save profile", error);
            const message = (error as any)?.response?.data?.message || (error as any)?.response?.data?.error || "Failed to save profile";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <Card>
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading profile...</p>
                    </div>
                </Card>
            </div>
        );
    }

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
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
                    <p className="text-slate-600 mt-2">
                        Manage your personal account information
                    </p>
                </div>

                <Card>
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 -m-6 mb-6 rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 text-3xl font-bold">
                                    {user.full_name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="ml-6 text-white">
                                    <h2 className="text-2xl font-bold">{user.full_name}</h2>
                                    <p className="text-blue-100 capitalize">{user.role || "User"}</p>
                                    <p className="text-blue-200 text-sm mt-1">
                                        {(user as any)?.organization?.name ? `Organization: ${(user as any).organization.name}` : "No Primary Organization"}
                                    </p>
                                </div>
                            </div>
                            {!isEditing && (
                                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-6">
                            {/* Account Info */}
                            <div className="space-y-4">
                                <h4 className="text-md font-semibold text-slate-900 border-b pb-2">Account Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                                        <p className="text-slate-900 font-medium px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">{user.email}</p>
                                        <p className="text-xs text-slate-500 mt-1">Managed by identity provider</p>
                                    </div>
                                    <Input
                                        label="Phone Number"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                        helperText="For account notifications"
                                    />
                                </div>
                            </div>

                            {/* Professional Details */}
                            <div className="space-y-4">
                                <h4 className="text-md font-semibold text-slate-900 border-b pb-2">Professional Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Practitioner Type / Specialty"
                                        value={formData.practitioner_type}
                                        onChange={(e) => setFormData({ ...formData, practitioner_type: e.target.value })}
                                        placeholder="e.g. Clinical Psychologist"
                                    />
                                    <Input
                                        label="Taxonomy Code"
                                        value={formData.taxonomy_code}
                                        onChange={(e) => setFormData({ ...formData, taxonomy_code: e.target.value })}
                                        placeholder="10-character code"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="License ID"
                                        value={formData.license_id}
                                        onChange={(e) => setFormData({ ...formData, license_id: e.target.value })}
                                        placeholder="State license number"
                                    />
                                    <Input
                                        label="License State"
                                        value={formData.license_state}
                                        onChange={(e) => setFormData({ ...formData, license_state: e.target.value })}
                                        placeholder="e.g. CA, NY"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Individual NPI"
                                        value={formData.npi}
                                        onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
                                        placeholder="10-digit Type 1 NPI"
                                        helperText="Your personal NPI as rendering provider"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <Button onClick={handleSave} loading={saving}>
                                    Save Changes
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                                    Cancel
                                </Button>
                            </div>
                            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Account Info Read-Only */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Account Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                                        <p className="text-slate-900 font-medium">{user.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Phone</label>
                                        <p className="text-slate-900 font-medium">{(user as any).phone || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Professional Details Read-Only */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Professional Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Practitioner Type</label>
                                        <p className="text-slate-900 font-medium">{(user as any).practitioner_type || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Taxonomy Code</label>
                                        <p className="text-slate-900 font-medium">{(user as any).taxonomy_code || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">License ID</label>
                                        <p className="text-slate-900 font-medium">{(user as any).license_id || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">License State</label>
                                        <p className="text-slate-900 font-medium">{(user as any).license_state || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Individual NPI</label>
                                        <p className="text-slate-900 font-medium">{(user as any).npi || "—"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions Section */}
                    {!isEditing && (
                        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
                            <Button variant="danger" onClick={handleLogout}>
                                Logout
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
