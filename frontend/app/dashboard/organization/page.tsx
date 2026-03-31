"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import DashboardHeader from "@/app/components/ui/DashboardHeader";
import { useAuth, useAuthorization } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import {
    Organization,
    OrganizationInvite,
    OrganizationMember,
} from "@/app/lib/types";
import { ORGANIZATION_MEMBER_ROLES, OrganizationMemberRole } from "@/app/lib/auth/roles";
import logger from "@/app/lib/logger";
import { OrganizationFormSchema } from "@/app/lib/validation/schemas";

const ROLE_OPTIONS: Array<{ value: OrganizationMemberRole; label: string }> = [
    { value: "clinician", label: "Clinician" },
    { value: "nurse", label: "Nurse" },
    { value: "billing_staff", label: "Billing staff" },
    { value: "receptionist", label: "Receptionist" },
];

function formatRoleLabel(role: string) {
    const match = ROLE_OPTIONS.find((option) => option.value === role);
    return match?.label || role;
}

export default function OrganizationProfilePage() {
    const { user, isLoading: authLoading } = useAuth();
    const { canManageOrganization } = useAuthorization();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [invites, setInvites] = useState<OrganizationInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [membersLoading, setMembersLoading] = useState(false);
    const [invitesLoading, setInvitesLoading] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [memberError, setMemberError] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedInviteRole, setSelectedInviteRole] = useState<OrganizationMemberRole>("clinician");
    const [generatedInvite, setGeneratedInvite] = useState<{
        code: string;
        role: OrganizationMemberRole;
        expiresAt: string;
        copied: boolean;
    } | null>(null);

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
        if (!authLoading && user && canManageOrganization) {
            void loadMembers();
            void loadInvites();
        }
    }, [authLoading, user, canManageOrganization]);

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

    const loadMembers = async () => {
        setMembersLoading(true);
        setMemberError(null);
        try {
            const response = await apiClient.organizations.getMembers();
            setMembers(response.data?.members || []);
        } catch (error) {
            logger.error("Failed to load organization members", error);
            setMemberError("Failed to load organization members.");
        } finally {
            setMembersLoading(false);
        }
    };

    const loadInvites = async () => {
        setInvitesLoading(true);
        setInviteError(null);
        try {
            const response = await apiClient.organizations.getInvites();
            setInvites(response.data?.invites || []);
        } catch (error) {
            logger.error("Failed to load organization invites", error);
            setInviteError("Failed to load organization invites.");
        } finally {
            setInvitesLoading(false);
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
            const firstErrorKey = validation.error.issues[0]?.path?.[0];
            if (firstErrorKey) {
                setTimeout(() => {
                    const el = document.getElementById(`org-field-${firstErrorKey}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 0);
            }
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, any> = {};
            Object.entries(formData).forEach(([key, value]) => {
                if (typeof value === "string") {
                    const trimmed = value.trim();
                    payload[key] = trimmed;
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

    const handleCreateInvite = async () => {
        setCreatingInvite(true);
        setInviteError(null);
        try {
            const response = await apiClient.organizations.createInvite({
                role: selectedInviteRole,
            });
            const payload = response.data || {};
            setGeneratedInvite({
                code: payload.invitationCode,
                role: payload.role,
                expiresAt: payload.expiresAt,
                copied: false,
            });
            await loadInvites();
        } catch (error) {
            logger.error("Failed to create invite", error);
            setInviteError("Failed to create invite code.");
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleCopyInvite = async () => {
        if (!generatedInvite) return;
        try {
            await navigator.clipboard.writeText(generatedInvite.code);
            setGeneratedInvite({ ...generatedInvite, copied: true });
        } catch (error) {
            logger.error("Failed to copy invite code", error);
            setInviteError("Failed to copy invite code.");
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
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            <DashboardHeader
                title="Organization Profile"
                subtitle="Manage your clinic's details, billing profile, and integration settings."
                actions={
                    canManageOrganization && !isEditing ? (
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
                                        id="org-field-name"
                                        label="Organization Name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Clinic Name"
                                        error={fieldErrors.name}
                                    />
                                     <Input
                                        id="org-field-phone"
                                        label="Phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 555-5555"
                                        error={fieldErrors.phone}
                                    />
                                </div>
                                <div className="mt-4 space-y-4">
                                     <Input
                                        id="org-field-address_line1"
                                        label="Address Line 1"
                                        value={formData.address_line1}
                                        onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                        placeholder="123 Main St"
                                        error={fieldErrors.address_line1}
                                    />
                                    <Input
                                        id="org-field-address_line2"
                                        label="Address Line 2"
                                        value={formData.address_line2}
                                        onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                        placeholder="Suite 100"
                                        error={fieldErrors.address_line2}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            id="org-field-city"
                                            label="City"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            error={fieldErrors.city}
                                        />
                                        <Input
                                            id="org-field-state"
                                            label="State"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                            error={fieldErrors.state}
                                        />
                                        <Input
                                            id="org-field-postal_code"
                                            label="Postal Code"
                                            value={formData.postal_code}
                                            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                            error={fieldErrors.postal_code}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Billing Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-4">Billing Profile</h3>
                                <p className="text-sm text-slate-600 mb-4">These details are used specifically for claims submission.</p>
                                <Input
                                    id="org-field-billing_name"
                                    label="Billing Name"
                                    value={formData.billing_name}
                                    onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                                    placeholder="Official Billing Name"
                                    error={fieldErrors.billing_name}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <Input
                                        id="org-field-billing_npi"
                                        label="Billing NPI"
                                        value={formData.billing_npi}
                                        onChange={(e) => setFormData({ ...formData, billing_npi: e.target.value })}
                                        placeholder="10-digit NPI"
                                        error={fieldErrors.billing_npi}
                                    />
                                    <Input
                                        id="org-field-billing_tax_id"
                                        label="Billing Tax ID"
                                        value={formData.billing_tax_id}
                                        onChange={(e) => setFormData({ ...formData, billing_tax_id: e.target.value })}
                                        placeholder="Tax ID"
                                        error={fieldErrors.billing_tax_id}
                                    />
                                </div>
                                <div className="mt-4 space-y-4">
                                     <Input
                                        id="org-field-billing_address_line1"
                                        label="Billing Address Line 1"
                                        value={formData.billing_address_line1}
                                        onChange={(e) => setFormData({ ...formData, billing_address_line1: e.target.value })}
                                        placeholder="123 Main St"
                                        error={fieldErrors.billing_address_line1}
                                    />
                                    <Input
                                        id="org-field-billing_address_line2"
                                        label="Billing Address Line 2"
                                        value={formData.billing_address_line2}
                                        onChange={(e) => setFormData({ ...formData, billing_address_line2: e.target.value })}
                                        placeholder="Suite 100"
                                        error={fieldErrors.billing_address_line2}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input
                                            id="org-field-billing_city"
                                            label="Billing City"
                                            value={formData.billing_city}
                                            onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                                            error={fieldErrors.billing_city}
                                        />
                                        <Input
                                            id="org-field-billing_state"
                                            label="Billing State"
                                            value={formData.billing_state}
                                            onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                                            error={fieldErrors.billing_state}
                                        />
                                        <Input
                                            id="org-field-billing_postal_code"
                                            label="Billing Postal Code"
                                            value={formData.billing_postal_code}
                                            onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                                            error={fieldErrors.billing_postal_code}
                                        />
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            id="org-field-billing_phone"
                                            label="Billing Phone"
                                            value={formData.billing_phone}
                                            onChange={(e) => setFormData({ ...formData, billing_phone: e.target.value })}
                                            placeholder="(555) 555-5555"
                                            error={fieldErrors.billing_phone}
                                        />
                                        <Input
                                            id="org-field-default_place_of_service"
                                            label="Default Place of Service"
                                            value={formData.default_place_of_service}
                                            onChange={(e) => setFormData({ ...formData, default_place_of_service: e.target.value })}
                                            placeholder="11"
                                            error={fieldErrors.default_place_of_service}
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
                                                id="org-field-edi_sender_id"
                                                label="EDI Sender ID"
                                                value={formData.edi_sender_id}
                                                onChange={(e) => setFormData({ ...formData, edi_sender_id: e.target.value })}
                                                error={fieldErrors.edi_sender_id}
                                            />
                                            <Input
                                                id="org-field-edi_receiver_id"
                                                label="EDI Receiver ID"
                                                value={formData.edi_receiver_id}
                                                onChange={(e) => setFormData({ ...formData, edi_receiver_id: e.target.value })}
                                                error={fieldErrors.edi_receiver_id}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <Input
                                                id="org-field-edi_sftp_host"
                                                label="SFTP Host"
                                                value={formData.edi_sftp_host}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_host: e.target.value })}
                                                error={fieldErrors.edi_sftp_host}
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
                                                id="org-field-edi_sftp_username"
                                                label="SFTP Username"
                                                value={formData.edi_sftp_username}
                                                onChange={(e) => setFormData({ ...formData, edi_sftp_username: e.target.value })}
                                                error={fieldErrors.edi_sftp_username}
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

            {canManageOrganization && (
                <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <Card
                        header={
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Organization Members</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Current members and their assigned roles.
                                </p>
                            </div>
                        }
                    >
                        {memberError && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {memberError}
                            </div>
                        )}

                        {membersLoading ? (
                            <div className="py-8 text-center text-sm text-slate-500">Loading members...</div>
                        ) : members.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-500">No members found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-widest text-slate-400">
                                            <th className="py-3 pr-4">Member</th>
                                            <th className="py-3 pr-4">Role</th>
                                            <th className="py-3">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {members.map((member) => (
                                            <tr key={member.id}>
                                                <td className="py-4 pr-4">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{member.full_name}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="inline-flex rounded-full bg-[var(--brand-50)] px-3 py-1 text-xs font-semibold text-[var(--brand-700)]">
                                                        {formatRoleLabel(member.role)}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-slate-500">
                                                    {member.created_at
                                                        ? new Date(member.created_at).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })
                                                        : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    <div className="space-y-8">
                        <Card
                            header={
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">Invite Member</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Generate a single-use invite code with a predefined role.
                                    </p>
                                </div>
                            }
                        >
                            {inviteError && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {inviteError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-600">Role</label>
                                    <select
                                        value={selectedInviteRole}
                                        onChange={(e) => setSelectedInviteRole(e.target.value as OrganizationMemberRole)}
                                        className="brand-input w-full rounded-lg px-3 py-2 text-sm"
                                    >
                                        {ROLE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleCreateInvite}
                                    loading={creatingInvite}
                                    className="w-full"
                                >
                                    Generate Invite Code
                                </Button>
                            </div>

                            {generatedInvite && (
                                <div className="mt-6 rounded-xl border border-[var(--brand-200)] bg-[var(--brand-50)] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-700)]">
                                        Invite Code
                                    </p>
                                    <p className="mt-2 break-all font-mono text-lg font-semibold text-[var(--brand-ink)]">
                                        {generatedInvite.code}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Role: {formatRoleLabel(generatedInvite.role)}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Expires: {new Date(generatedInvite.expiresAt).toLocaleString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleCopyInvite}
                                        className="mt-4 w-full"
                                    >
                                        {generatedInvite.copied ? "Copied" : "Copy Code"}
                                    </Button>
                                </div>
                            )}
                        </Card>

                        <Card
                            header={
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">Recent Invites</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Active and redeemed invite history for this organization.
                                    </p>
                                </div>
                            }
                        >
                            {invitesLoading ? (
                                <div className="py-8 text-center text-sm text-slate-500">Loading invites...</div>
                            ) : invites.length === 0 ? (
                                <div className="py-8 text-center text-sm text-slate-500">No invites created yet.</div>
                            ) : (
                                <div className="space-y-4">
                                    {invites.slice(0, 6).map((invite) => (
                                        <div key={invite.id} className="rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {formatRoleLabel(invite.role)}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Created by {invite.created_by.full_name}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                        invite.used_at
                                                            ? "bg-slate-100 text-slate-600"
                                                            : "bg-[var(--brand-50)] text-[var(--brand-700)]"
                                                    }`}
                                                >
                                                    {invite.used_at ? "Used" : "Active"}
                                                </span>
                                            </div>
                                            <p className="mt-3 text-xs text-slate-500">
                                                Expires {new Date(invite.expires_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                            {invite.used_by && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Redeemed by {invite.used_by.full_name}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
