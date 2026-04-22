"use client";

import { useEffect, useState } from "react";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import { ProfileFormSchema } from "@/app/lib/validation/schemas";

export default function ProfilePage() {
    const { user, checkAuth } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        phone: (user as any)?.phone || "",
        practitioner_type: (user as any)?.practitioner_type || "",
        license_id: (user as any)?.license_id || "",
        license_state: (user as any)?.license_state || "",
        npi: (user as any)?.npi || "",
        taxonomy_code: (user as any)?.taxonomy_code || "",
    });
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

    const handleSave = async () => {
        setError(null);
        setFieldErrors({});

        const validation = ProfileFormSchema.safeParse(formData);
        if (!validation.success) {
            const errs: Record<string, string> = {};
            validation.error.issues.forEach((err) => {
                const key = String(err.path[0]);
                if (key && !errs[key]) errs[key] = err.message;
            });
            setFieldErrors(errs);
            return;
        }

        setSaving(true);
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
            logger.error("Failed to save profile", error);
            const message = (error as any)?.response?.data?.message || (error as any)?.response?.data?.error || "Failed to save profile";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <Card>
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-600)] mx-auto mb-4"></div>
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
        <div className="max-w-6xl mx-auto px-6 py-8">
            <DashboardHeader
                title="My Profile"
                subtitle="Manage your personal account information."
                actions={
                    !isEditing ? (
                        <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                            Edit Profile
                        </Button>
                    ) : undefined
                }
            />

            <Card>
                <div className="mb-8 flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="brand-accent-icon flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold">
                            {user.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">{user.full_name}</h2>
                            <p className="mt-1 text-sm capitalize text-slate-500">{user.role || "User"}</p>
                            <p className="mt-1 text-sm text-slate-500">
                                {(user as any)?.organization?.name ? `Organization: ${(user as any).organization.name}` : "No Primary Organization"}
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">Member since {createdDate}</p>
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
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                        maxLength={15}
                                        helperText="For account notifications"
                                        error={fieldErrors.phone}
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
                                        maxLength={100}
                                        error={fieldErrors.practitioner_type}
                                    />
                                    <Input
                                        label="Taxonomy Code"
                                        value={formData.taxonomy_code}
                                        onChange={(e) => setFormData({ ...formData, taxonomy_code: e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() })}
                                        placeholder="10-character code"
                                        maxLength={10}
                                        pattern="[A-Za-z0-9]{10}"
                                        error={fieldErrors.taxonomy_code}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="License ID"
                                        value={formData.license_id}
                                        onChange={(e) => setFormData({ ...formData, license_id: e.target.value })}
                                        placeholder="State license number"
                                        maxLength={50}
                                        error={fieldErrors.license_id}
                                    />
                                    <Input
                                        label="License State"
                                        value={formData.license_state}
                                        onChange={(e) => setFormData({ ...formData, license_state: e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() })}
                                        placeholder="CA"
                                        maxLength={2}
                                        error={fieldErrors.license_state}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Individual NPI"
                                        value={formData.npi}
                                        onChange={(e) => setFormData({ ...formData, npi: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                        placeholder="10-digit Type 1 NPI"
                                        maxLength={10}
                                        inputMode="numeric"
                                        pattern="\d{10}"
                                        helperText="Your personal NPI as rendering provider"
                                        error={fieldErrors.npi}
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
            </Card>
        </div>
    );
}
