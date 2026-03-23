"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiClient } from "@/app/lib/api/apiClient";
import { Patient, Encounter } from "@/app/lib/types";
import BackButton from "@/app/components/ui/BackButton";
import Card from "@/app/components/ui/Card";
import Button from "@/app/components/ui/Button";
import logger from "@/app/lib/logger";

const mapPatientResponse = (data: any): Patient => ({
    id: data.id,
    name: data.full_name || data.name,
    age: data.age || 0,
    dob: data.dob,
    gender: data.gender,
    phone: data.phone,
    email: data.email,
    insuranceType: data.insurance_provider,
    insuranceId: data.insurance_policy_number,
    insurance_member_id: data.insurance_member_id,
    insurance_group_number: data.insurance_group_number,
    insurance_payer_id: data.insurance_payer_id,
    insurance_payer_name: data.insurance_payer_name,
    insurance_relationship: data.insurance_relationship,
    plan_name: data.plan_name,
    address_street: data.address_street,
    address_city: data.address_city,
    address_state: data.address_state,
    address_zip: data.address_zip,
});

export default function PatientProfilePage() {
    const params = useParams();
    const patientId = params?.id as string;

    const [patient, setPatient] = useState<Patient | null>(null);
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedPatient, setEditedPatient] = useState<Patient | null>(null);

    useEffect(() => {
        if (patientId) {
            fetchData();
        }
    }, [patientId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Patient
            const patientResponse = await apiClient.patients.getById(patientId);
            const patientData = patientResponse.data?.data || patientResponse.data;
            const mappedPatient = mapPatientResponse(patientData);
            setPatient(mappedPatient);
            setEditedPatient(mappedPatient);

            // Fetch Encounters - backend filters by patient_id for security
            const encountersResponse = await apiClient.encounters.getAllByPatient(patientId);
            const encountersData = encountersResponse.data?.data || [];
            setEncounters(encountersData);

        } catch (err) {
            logger.error("Failed to load patient profile", err);
            setError("Failed to load patient details.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editedPatient) return;
        setSaving(true);
        try {
            await apiClient.patients.update(patientId, {
                full_name: editedPatient.name,
                dob: editedPatient.dob,
                gender: editedPatient.gender,
                phone: editedPatient.phone,
                email: editedPatient.email,
                address_street: editedPatient.address_street,
                address_city: editedPatient.address_city,
                address_state: editedPatient.address_state,
                address_zip: editedPatient.address_zip,
                insurance_provider: editedPatient.insuranceType,
                insurance_policy_number: editedPatient.insuranceId,
                insurance_member_id: editedPatient.insurance_member_id,
                insurance_group_number: editedPatient.insurance_group_number,
            });
            setPatient(editedPatient);
            setEditMode(false);
        } catch (err) {
            logger.error("Failed to update patient", err);
            alert("Failed to update patient");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedPatient(patient);
        setEditMode(false);
    };

    // Determine which step to continue from based on encounter data
    const getContinueStep = (encounter: Encounter): number => {
        // If status is ready or completed, go to summary
        if (encounter.status === "ready" || encounter.status === "completed") {
            return -1; // Special case for summary
        }

        // Step 0: Setup
        // Step 1: Audio/Transcription
        // Step 2: SOAP Note
        // Step 3: Medical Codes
        // Step 4: Review Claim

        // If no audio/transcript, start at step 1 (audio upload)
        if (!encounter.audio_key && !encounter.transcript_result_id) {
            return 1;
        }

        // If has audio but no transcript, go to step 1 (transcription)
        if (!encounter.transcript_result_id) {
            return 1;
        }

        // If has transcript, go to step 2 (SOAP) - user needs to review/generate SOAP
        // We stay on SOAP step until user explicitly continues to codes
        if (encounter.transcript_result_id) {
            return 2;
        }

        // Default to step 3 (medical codes)
        return 3;
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await apiClient.encounters.delete(id);
            setEncounters((prev) => prev.filter((e) => e.id !== id));
        } catch (err) {
            logger.error("Failed to delete encounter", err);
            // Optionally set a temporary error state for deleting
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ borderBottom: '2px solid var(--rc-teal)' }}></div>
                    <p className="font-mono text-sm" style={{ color: 'var(--rc-text-muted)' }}>Loading patient profile...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="rounded-lg p-4" style={{ background: 'var(--rc-rose-glow)', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--rc-rose)' }}>
                    {error || "Patient not found."}
                </div>
                <div className="mt-4">
                    <BackButton href="/dashboard">Back to Dashboard</BackButton>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            {/* Patient Information Card */}
            <Card>
                <div className="px-6 py-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 mb-6" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                        <div className="flex items-center gap-4">
                            <div className="brand-accent-icon flex h-16 w-16 items-center justify-center rounded-full text-2xl font-mono font-bold">
                                {(patient.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold" style={{ color: 'var(--rc-text-primary)' }}>{patient.name}</h1>
                                <p className="text-xs font-mono uppercase tracking-wide mt-1" style={{ color: 'var(--rc-text-muted)' }}>Patient Profile</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!editMode ? (
                                <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
                                    Edit Profile
                                </Button>
                            ) : (
                                <>
                                    <Button onClick={handleSave} loading={saving} size="sm">
                                        {saving ? "Saving..." : "Save"}
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={handleCancel} disabled={saving}>
                                        Cancel
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Date of Birth</p>
                            {editMode && editedPatient ? (
                                <input
                                    type="date"
                                    value={editedPatient.dob || ""}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, dob: e.target.value })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                />
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>{patient.dob ? new Date(patient.dob).toLocaleDateString() : "—"}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Gender</p>
                            {editMode && editedPatient ? (
                                <select
                                    value={editedPatient.gender || "U"}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, gender: e.target.value as any })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                >
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                    <option value="O">Other</option>
                                    <option value="U">Unknown</option>
                                </select>
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>
                                    {patient.gender === "M" ? "Male" : patient.gender === "F" ? "Female" : patient.gender === "O" ? "Other" : patient.gender === "U" ? "Unknown" : "—"}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Phone</p>
                            {editMode && editedPatient ? (
                                <input
                                    type="tel"
                                    value={editedPatient.phone || ""}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, phone: e.target.value })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                />
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>{patient.phone || "—"}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Email</p>
                            {editMode && editedPatient ? (
                                <input
                                    type="email"
                                    value={editedPatient.email || ""}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, email: e.target.value })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                />
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>{patient.email || "—"}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Insurance Provider</p>
                            {editMode && editedPatient ? (
                                <input
                                    type="text"
                                    value={editedPatient.insuranceType || ""}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, insuranceType: e.target.value })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                />
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>{patient.insuranceType || "—"}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Policy Number</p>
                            {editMode && editedPatient ? (
                                <input
                                    type="text"
                                    value={editedPatient.insuranceId || ""}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, insuranceId: e.target.value })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                />
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>{patient.insuranceId || "—"}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Member ID</p>
                            {editMode && editedPatient ? (
                                <input
                                    type="text"
                                    value={editedPatient.insurance_member_id || ""}
                                    onChange={(e) => setEditedPatient({ ...editedPatient, insurance_member_id: e.target.value })}
                                    className="brand-input font-mono text-sm rounded-lg px-3 py-2 w-full"
                                />
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>{patient.insurance_member_id || "—"}</p>
                            )}
                        </div>
                        <div className="md:col-span-3">
                            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--rc-text-muted)' }}>Address</p>
                            {editMode && editedPatient ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Street"
                                        value={editedPatient.address_street || ""}
                                        onChange={(e) => setEditedPatient({ ...editedPatient, address_street: e.target.value })}
                                        className="brand-input font-mono text-sm rounded-lg px-3 py-2"
                                    />
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={editedPatient.address_city || ""}
                                        onChange={(e) => setEditedPatient({ ...editedPatient, address_city: e.target.value })}
                                        className="brand-input font-mono text-sm rounded-lg px-3 py-2"
                                    />
                                    <input
                                        type="text"
                                        placeholder="State"
                                        value={editedPatient.address_state || ""}
                                        onChange={(e) => setEditedPatient({ ...editedPatient, address_state: e.target.value })}
                                        className="brand-input font-mono text-sm rounded-lg px-3 py-2"
                                    />
                                    <input
                                        type="text"
                                        placeholder="ZIP"
                                        value={editedPatient.address_zip || ""}
                                        onChange={(e) => setEditedPatient({ ...editedPatient, address_zip: e.target.value })}
                                        className="brand-input font-mono text-sm rounded-lg px-3 py-2"
                                    />
                                </div>
                            ) : (
                                <p className="font-mono text-sm" style={{ color: 'var(--rc-text-primary)' }}>
                                    {[
                                        patient.address_street,
                                        patient.address_city,
                                        patient.address_state,
                                        patient.address_zip
                                    ].filter(Boolean).join(", ") || "—"}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Encounters List Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--rc-text-primary)' }}>Encounters History</h2>
                    <Link
                        href={`/dashboard/encounters/create?patientId=${patientId}`}
                        className="brand-button-primary rounded-lg px-4 py-2 text-sm font-mono font-medium"
                    >
                        + Start New Encounter
                    </Link>
                </div>

                {encounters.length === 0 ? (
                    <Card>
                        <div className="p-8 text-center">
                            <p className="font-mono text-sm" style={{ color: 'var(--rc-text-faint)' }}>No encounters recorded for this patient.</p>
                            <Link
                                href={`/dashboard/encounters/create?patientId=${patientId}`}
                                className="font-mono text-sm font-medium mt-2 inline-block transition-colors"
                                style={{ color: 'var(--rc-teal)' }}
                            >
                                Start the first encounter
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--rc-surface)', border: '1px solid var(--rc-border)' }}>
                        <table className="w-full table-fixed">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--rc-border)' }}>
                                    <th className="w-1/3 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rc-text-faint)' }}>
                                        Date
                                    </th>
                                    <th className="w-1/3 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rc-text-faint)' }}>
                                        Status
                                    </th>
                                    <th className="w-1/3 px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rc-text-faint)' }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {encounters.map((encounter, idx) => (
                                    <tr
                                        key={encounter.id}
                                        className="animate-tableRowIn transition-colors"
                                        style={{
                                            borderBottom: idx < encounters.length - 1 ? '1px solid var(--rc-border)' : undefined,
                                            animationDelay: `${idx * 50}ms`,
                                        }}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'var(--rc-text-primary)' }}>
                                            {new Date(encounter.date_of_service).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className="px-2 py-0.5 text-xs font-mono font-medium rounded-full"
                                                style={
                                                    encounter.status === "completed"
                                                        ? { background: 'var(--rc-teal-glow)', color: 'var(--rc-teal)', border: '1px solid rgba(0, 212, 184, 0.2)' }
                                                        : encounter.status === "ready"
                                                            ? { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' }
                                                            : encounter.status === "in_progress"
                                                                ? { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--rc-amber)', border: '1px solid rgba(245, 158, 11, 0.2)' }
                                                                : { background: 'var(--rc-elevated)', color: 'var(--rc-text-muted)', border: '1px solid var(--rc-border)' }
                                                }
                                            >
                                                {encounter.status === "ready"
                                                    ? "Ready"
                                                    : encounter.status === "completed"
                                                        ? "Completed"
                                                        : encounter.status?.replace("_", " ") || "Draft"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {encounter.status === "ready" || encounter.status === "completed" ? (
                                                <Link
                                                    href={`/dashboard/encounters/${encounter.id}`}
                                                    className="font-mono text-sm font-medium transition-colors"
                                                    style={{ color: 'var(--rc-teal)' }}
                                                >
                                                    View
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={`/dashboard/encounters/create?id=${encounter.id}&step=${getContinueStep(encounter)}`}
                                                    className="font-mono text-sm font-medium transition-colors"
                                                    style={{ color: 'var(--rc-teal)' }}
                                                >
                                                    Continue
                                                </Link>
                                            )}
                                            <button
                                                type="button"
                                                aria-label="Delete encounter"
                                                onClick={() => handleDelete(encounter.id)}
                                                className="ml-4 transition-colors"
                                                style={{ color: 'var(--rc-text-faint)' }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--rc-rose)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--rc-text-faint)')}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M8.5 3a1.5 1.5 0 00-1.415 1H4.5a.5.5 0 000 1H5v9.5A1.5 1.5 0 006.5 16h7a1.5 1.5 0 001.5-1.5V5h.5a.5.5 0 000-1h-2.585A1.5 1.5 0 0011.5 3h-3zm0 1a.5.5 0 00-.5.5V5h4v-.5a.5.5 0 00-.5-.5h-3zM6 6h8v8.5a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5V6zm2 2a.5.5 0 10-1 0v5a.5.5 0 001 0V8zm4 .5a.5.5 0 10-1 0v5a.5.5 0 101 0v-5z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
