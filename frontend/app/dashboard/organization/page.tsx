"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Organization } from "@/app/lib/types";
import logger from "@/app/lib/logger";

export default function OrganizationProfilePage() {
    const { user, checkAuth, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [formData, setFormData] = useState({
        // General
        name: "",
        npi: "",
        tax_id: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        phone: "",
        // Billing
        billing_name: "",
        billing_npi: "",
        billing_tax_id: "",
        billing_address_line1: "",
        billing_address_line2: "",
        billing_city: "",
        billing_state: "",
        billing_postal_code: "",
        billing_phone: "",
        default_place_of_service: "",
        // EDI/SFTP (credentials excluded for security)
        edi_sender_id: "",
        edi_receiver_id: "",
        edi_sftp_host: "",
        edi_sftp_username: "",
        edi_sftp_port: "",
    });

    useEffect(() => {
        if (!authLoading && user) {
            loadOrganization();
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (organization) {
            setFormData({
                name: organization.name || "",
                npi: organization.npi || "",
                tax_id: organization.tax_id || "",
                address_line1: organization.address_line1 || "",
                address_line2: organization.address_line2 || "",
                city: organization.city || "",
                state: organization.state || "",
                postal_code: organization.postal_code || "",
                phone: organization.phone || "",
                billing_name: organization.billing_name || "",
                billing_npi: organization.billing_npi || "",
                billing_tax_id: organization.billing_tax_id || "",
                billing_address_line1: organization.billing_address_line1 || "",
                billing_address_line2: organization.billing_address_line2 || "",
                billing_city: organization.billing_city || "",
                billing_state: organization.billing_state || "",
                billing_postal_code: organization.billing_postal_code || "",
                billing_phone: organization.billing_phone || "",
                default_place_of_service: organization.default_place_of_service || "",
                edi_sender_id: organization.edi_sender_id || "",
                edi_receiver_id: organization.edi_receiver_id || "",
                edi_sftp_host: organization.edi_sftp_host || "",
                edi_sftp_username: organization.edi_sftp_username || "",
                edi_sftp_port: organization.edi_sftp_port?.toString() || "",
                // SECURITY: Credentials excluded - managed securely on server
            });
        }
    }, [organization]);

    const loadOrganization = async () => {
        setLoading(true);
        try {
            const response = await apiClient.organizations.getCurrent();
            // Helper to extract org same as dashboard
            const extractOrg = (payload: any) => {
                if (!payload) return null;
                if (payload.data?.organization) return payload.data.organization;
                if (payload.data?.data) return payload.data.data;
                if (payload.data) return payload.data;
                if (payload.organization) return payload.organization;
                return payload;
            };
            setOrganization(extractOrg(response));
        } catch (error) {
            logger.error("Failed to load organization", error);
            setError("Failed to load organization details.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const payload: Record<string, any> = {};
            Object.entries(formData).forEach(([key, value]) => {
                if (typeof value === "string") {
                    const trimmed = value.trim();
                    if (trimmed !== "") payload[key] = trimmed;
                } else if (value !== undefined) {
                     payload[key] = value;
                }
            });
            
             if (formData.edi_sftp_port) {
                payload.edi_sftp_port = parseInt(formData.edi_sftp_port as string);
            }


            await apiClient.organizations.updateCurrent(payload);
            await loadOrganization(); // Reload to get updated data
            setIsEditing(false);
            // Optionally checkAuth if organization info is attached to user object in context
            // await checkAuth(); 
        } catch (error: any) {
            logger.error("Failed to save organization", error);
            // SECURITY: Use sanitized error.message from axios interceptor
            setError(error?.message || "Could not save organization.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <Card>
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading organization...</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (!organization) {
        return (
             <div className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-4xl mx-auto">
                     <Card>
                        <div className="text-center p-8">
                            <p className="text-slate-600 mb-4">No organization found.</p>
                            <Link href="/dashboard">
                                <Button>Back to Dashboard</Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

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
                    <div className="flex justify-between items-center">
                         <div>
                            <h1 className="text-3xl font-bold text-slate-900">Organization Profile</h1>
                            <p className="text-slate-600 mt-2">
                                Manage your clinic's details, billing profile, and integration settings.
                            </p>
                         </div>
                         {!isEditing && (
                            <Button onClick={() => setIsEditing(true)}>
                                Edit Organization
                            </Button>
                         )}
                    </div>
                </div>

                <Card>
                    {error && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                            {error}
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-8">
                            {/* General Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Organization Name"
                                        autoComplete="organization"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Clinic Name"
                                    />
                                     <Input
                                        label="Phone"
                                        autoComplete="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 555-5555"
                                    />
                                </div>
                                <div className="mt-4 space-y-4">
                                     <Input
                                        label="Address Line 1"
                                        autoComplete="address-line1"
                                        value={formData.address_line1}
                                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                        placeholder="123 Main St"
                                    />
                                    <Input
                                        label="Address Line 2"
                                        autoComplete="address-line2"
                                        value={formData.address_line2}
                                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                        placeholder="Suite 100"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            label="City"
                                            autoComplete="address-level2"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        />
                                        <Input
                                            label="State"
                                            autoComplete="address-level1"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        />
                                        <Input
                                            label="Postal Code"
                                            autoComplete="postal-code"
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Billing Profile</h3>
                                <p className="text-sm text-slate-600 mb-4">These details are used specifically for claims submission.</p>
                                <Input
                                    label="Billing Name"
                                    autoComplete="off"
                                    value={formData.billing_name}
                                    onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                                    placeholder="Official Billing Name"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <Input
                                        label="Billing NPI"
                                        autoComplete="off"
                                        value={formData.billing_npi}
                                        onChange={(e) => setFormData({ ...formData, billing_npi: e.target.value })}
                                        placeholder="10-digit NPI"
                                    />
                                    <Input
                                        label="Billing Tax ID"
                                        autoComplete="off"
                                        value={formData.billing_tax_id}
                                        onChange={(e) => setFormData({ ...formData, billing_tax_id: e.target.value })}
                                        placeholder="Tax ID"
                                    />
                                </div>
                                <div className="mt-4 space-y-4">
                                     <Input
                                        label="Billing Address Line 1"
                                        autoComplete="off"
                                        value={formData.billing_address_line1}
                                        onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
                                        placeholder="123 Main St"
                                    />
                                    <Input
                                        label="Billing Address Line 2"
                                        autoComplete="off"
                                        value={formData.billing_address_line2}
                                        onChange={(e) => setFormData({ ...formData, billing_address_line2: e.target.value })}
                                        placeholder="Suite 100"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            label="Billing City"
                                            autoComplete="off"
                                            value={formData.billing_city}
                                            onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                                        />
                                        <Input
                                            label="Billing State"
                                            autoComplete="off"
                                            value={formData.billing_state}
                                            onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                                        />
                                        <Input
                                            label="Billing Postal Code"
                                            autoComplete="off"
                                            value={formData.billing_postal_code}
                                            onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                                        />
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Billing Phone"
                                            autoComplete="off"
                                            value={formData.billing_phone}
                                            onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
                                            placeholder="(555) 555-5555"
                                        />
                                        <Input
                                            label="Default Place of Service"
                                            autoComplete="off"
                                            value={formData.default_place_of_service}
                                            onChange={(e) => setFormData({ ...formData, default_place_of_service: e.target.value })}
                                            placeholder="11"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* EDI/SFTP Settings */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-lg font-semibold text-slate-900 border-b pb-2 mb-4 w-full"
                                >
                                    <svg
                                        className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    EDI & Clearinghouse (Advanced)
                                </button>

                                {showAdvanced && (
                                    <div className="pl-6 border-l-2 border-blue-200 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                label="EDI Sender ID"
                                                autoComplete="off"
                                                value={formData.edi_sender_id}
                                                onChange={(e) => setFormData({ ...formData, edi_sender_id: e.target.value })}
                                            />
                                            <Input
                                                label="EDI Receiver ID"
                                                autoComplete="off"
                                                value={formData.edi_receiver_id}
                                                onChange={(e) => setFormData({ ...formData, edi_receiver_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <Input
                                                label="SFTP Host"
                                                autoComplete="off"
                                                value={formData.edi_sftp_host}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_host: e.target.value })}
                                            />
                                            <Input
                                                label="SFTP Port"
                                                autoComplete="off"
                                                value={formData.edi_sftp_port}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_port: e.target.value })}
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Input
                                                label="SFTP Username"
                                                autoComplete="off"
                                                value={formData.edi_sftp_username}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_username: e.target.value })}
                                            />
                                        </div>
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-900 font-medium">
                                                🔒 SFTP Credentials
                                            </p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                SFTP passwords and private keys are managed securely on the server. Contact your administrator to update credentials.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <Button onClick={handleSave} loading={saving}>
                                    Save Changes
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                             {/* General Read-Only */}
                             <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">General Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Organization Name</label>
                                        <p className="text-slate-900 font-medium">{organization.name}</p>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Phone</label>
                                        <p className="text-slate-900 font-medium">{organization.phone || "—"}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Address</label>
                                        <p className="text-slate-900 font-medium">
                                            {[
                                                organization.address_line1,
                                                organization.address_line2,
                                                [organization.city, organization.state].filter(Boolean).join(", "),
                                                organization.postal_code
                                            ].filter(Boolean).join(" · ") || "—"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                             {/* Billing Read-Only */}
                             <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Billing Profile</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Billing Name</label>
                                        <p className="text-slate-900 font-medium">{organization.billing_name || "—"}</p>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Billing Phone</label>
                                        <p className="text-slate-900 font-medium">{organization.billing_phone || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Billing NPI</label>
                                        <p className="text-slate-900 font-medium">{organization.billing_npi || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Billing Tax ID</label>
                                        <p className="text-slate-900 font-medium">{organization.billing_tax_id || "—"}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Billing Address</label>
                                        <p className="text-slate-900 font-medium">
                                            {[
                                                organization.billing_address_line1,
                                                organization.billing_address_line2,
                                                [organization.billing_city, organization.billing_state].filter(Boolean).join(", "),
                                                organization.billing_postal_code
                                            ].filter(Boolean).join(" · ") || "—"}
                                        </p>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">Default POS</label>
                                        <p className="text-slate-900 font-medium">{organization.default_place_of_service || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* EDI Read-Only */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">EDI & Clearinghouse</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">EDI Sender ID</label>
                                        <p className="text-slate-900 font-medium">{organization.edi_sender_id || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">EDI Receiver ID</label>
                                        <p className="text-slate-900 font-medium">{organization.edi_receiver_id || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">SFTP Host</label>
                                        <p className="text-slate-900 font-medium">{organization.edi_sftp_host || "—"}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 mb-1">SFTP Username</label>
                                        <p className="text-slate-900 font-medium">{organization.edi_sftp_username || "—"}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-500 mb-1">SFTP Credentials</label>
                                        <p className="text-slate-700 text-sm">🔒 Credentials managed securely on server</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
