"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Organization } from "@/app/lib/types";
import logger from "@/app/lib/logger";
import { OrganizationFormSchema } from "@/app/lib/validation/schemas";

export default function OrganizationProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
        setError(null);
        setFieldErrors({});

        const validation = OrganizationFormSchema.safeParse(formData);
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
            let message = "Could not save organization.";
            if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                message = error.response.data.errors
                    .map((err: any) => `${err.path.join(".")}: ${err.message}`)
                    .join(", ");
            } else if (error?.response?.data?.message) {
                message = error.response.data.message;
            }
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <Card>
                    <div className="text-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-600)] mx-auto mb-4"></div>
                        <p className="text-slate-600">Loading organization...</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (!organization) {
        return (
             <div className="max-w-6xl mx-auto px-6 py-8">
                     <Card>
                        <div className="text-center p-8">
                            <p className="text-slate-600 mb-4">No organization found.</p>
                            <Link href="/dashboard">
                                <Button>Back to Dashboard</Button>
                            </Link>
                        </div>
                    </Card>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <DashboardHeader
                title="Organization Profile"
                subtitle="Manage your clinic's details, billing profile, and integration settings."
                actions={
                    !isEditing ? (
                        <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                            Edit Organization
                        </Button>
                    ) : undefined
                }
            />

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
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Clinic Name"
                                    />
                                     <Input
                                        label="Phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 555-5555"
                                    />
                                </div>
                                <div className="mt-4 space-y-4">
                                     <Input
                                        label="Address Line 1"
                                        value={formData.address_line1}
                                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                        placeholder="123 Main St"
                                    />
                                    <Input
                                        label="Address Line 2"
                                        value={formData.address_line2}
                                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                        placeholder="Suite 100"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            label="City"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        />
                                        <Input
                                            label="State"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        />
                                        <Input
                                            label="Postal Code"
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
                                    value={formData.billing_name}
                                    onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                                    placeholder="Official Billing Name"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <Input
                                        label="Billing NPI"
                                        value={formData.billing_npi}
                                        onChange={(e) => setFormData({ ...formData, billing_npi: e.target.value })}
                                        placeholder="10-digit NPI"
                                    />
                                    <Input
                                        label="Billing Tax ID"
                                        value={formData.billing_tax_id}
                                        onChange={(e) => setFormData({ ...formData, billing_tax_id: e.target.value })}
                                        placeholder="Tax ID"
                                    />
                                </div>
                                <div className="mt-4 space-y-4">
                                     <Input
                                        label="Billing Address Line 1"
                                        value={formData.billing_address_line1}
                                        onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
                                        placeholder="123 Main St"
                                    />
                                    <Input
                                        label="Billing Address Line 2"
                                        value={formData.billing_address_line2}
                                        onChange={(e) => setFormData({ ...formData, billing_address_line2: e.target.value })}
                                        placeholder="Suite 100"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            label="Billing City"
                                            value={formData.billing_city}
                                            onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                                        />
                                        <Input
                                            label="Billing State"
                                            value={formData.billing_state}
                                            onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                                        />
                                        <Input
                                            label="Billing Postal Code"
                                            value={formData.billing_postal_code}
                                            onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                                        />
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Billing Phone"
                                            value={formData.billing_phone}
                                            onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
                                            placeholder="(555) 555-5555"
                                        />
                                        <Input
                                            label="Default Place of Service"
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
                                                value={formData.edi_sender_id}
                                                onChange={(e) => setFormData({ ...formData, edi_sender_id: e.target.value })}
                                            />
                                            <Input
                                                label="EDI Receiver ID"
                                                value={formData.edi_receiver_id}
                                                onChange={(e) => setFormData({ ...formData, edi_receiver_id: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <Input
                                                label="SFTP Host"
                                                value={formData.edi_sftp_host}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_host: e.target.value })}
                                            />
                                            <Input
                                                label="SFTP Port"
                                                value={formData.edi_sftp_port}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_port: e.target.value })}
                                                error={fieldErrors.edi_sftp_port}
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <Input
                                                label="SFTP Username"
                                                value={formData.edi_sftp_username}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_username: e.target.value })}
                                            />
                                        </div>
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-900 font-medium flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                SFTP Credentials
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
                                        <p className="text-slate-700 text-sm flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            Credentials managed securely on server
                                        </p>
                                    </div>
                                </div>
                            </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
