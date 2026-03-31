"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthorization } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import { Patient, Encounter } from "@/app/lib/types";
import { EditPatientFormSchema } from "@/app/lib/validation/schemas";
import BackButton from "@/app/components/ui/BackButton";
import Card from "@/app/components/ui/Card";
import UnauthorizedState from "@/app/components/ui/UnauthorizedState";
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
    insurance_policy_number: data.insurance_policy_number,
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
    const { canReadPatients, canWritePatients, canManageEncounters } = useAuthorization();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedPatient, setEditedPatient] = useState<Patient | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Track the last patientId fetched to prevent double-fetch.
    // React 18 Strict Mode remounts with restored refs, so this ref remains set
    // on the second mount and blocks the duplicate request. On real navigation
    // to a different patient, patientId !== fetchedPatientIdRef.current so the
    // fetch runs correctly.
    const fetchedPatientIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!canReadPatients) {
            setLoading(false);
            return;
        }

        if (patientId && fetchedPatientIdRef.current !== patientId) {
            fetchedPatientIdRef.current = patientId;
            fetchData();
        }
    }, [patientId, canReadPatients]);

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
        if (!canWritePatients) return;
        if (!editedPatient) return;

        const validation = EditPatientFormSchema.safeParse({
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
        if (!validation.success) {
            const errs: Record<string, string> = {};
            validation.error.issues.forEach((err) => {
                const key = String(err.path[0]);
                if (key && !errs[key]) errs[key] = err.message;
            });
            setFieldErrors(errs);
            const first = validation.error.issues[0];
            setSaveError(first ? first.message : "Please fix validation errors");
            const firstErrorKey = validation.error.issues[0]?.path?.[0];
            if (firstErrorKey) {
                setTimeout(() => {
                    const el = document.getElementById(`patient-edit-${firstErrorKey}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 0);
            }
            return;
        }
        setFieldErrors({});
        setSaveError(null);

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
            setSaveError("Failed to update patient");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedPatient(patient);
        setFieldErrors({});
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

    if (!canReadPatients) {
        return (
            <div className="max-w-6xl mx-auto px-6 py-8">
                <UnauthorizedState message="Your role does not have access to patient details." />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-500">Loading patient profile...</div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                        {error || "Patient not found."}
                    </div>
                    <div className="mt-4">
                        <BackButton href="/dashboard">Back to Dashboard</BackButton>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Patient Information Card */}
                <Card>
                    <div className="px-6 py-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                                    {(patient.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{patient.name}</h1>
                                    <p className="text-slate-500 mt-1">Patient Profile</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!editMode && canWritePatients ? (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="brand-button-primary px-4 py-2 rounded-lg font-medium text-sm"
                                    >
                                        Edit Profile
                                    </button>
                                ) : editMode ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="brand-button-primary px-4 py-2 rounded-lg font-medium text-sm disabled:bg-slate-300"
                                        >
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={saving}
                                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium text-sm disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        {saveError && (
                                            <p className="text-sm text-red-600 mt-1">{saveError}</p>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Date of Birth</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            id="patient-edit-dob"
                                            type="date"
                                            value={editedPatient.dob || ""}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, dob: e.target.value })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1"
                                        />
                                        {fieldErrors.dob && <p className="mt-1 text-sm text-red-500">{fieldErrors.dob}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.dob ? new Date(patient.dob).toLocaleDateString() : "—"}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Gender</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <select
                                            id="patient-edit-gender"
                                            value={editedPatient.gender || "U"}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, gender: e.target.value as any })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1"
                                        >
                                            <option value="M">Male</option>
                                            <option value="F">Female</option>
                                            <option value="O">Other</option>
                                            <option value="U">Unknown</option>
                                        </select>
                                        {fieldErrors.gender && <p className="mt-1 text-sm text-red-500">{fieldErrors.gender}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">
                                        {patient.gender === "M" ? "Male" : patient.gender === "F" ? "Female" : patient.gender === "O" ? "Other" : patient.gender === "U" ? "Unknown" : "—"}
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Phone</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            id="patient-edit-phone"
                                            type="tel"
                                            value={editedPatient.phone || ""}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, phone: e.target.value })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                        />
                                        {fieldErrors.phone && <p className="mt-1 text-sm text-red-500">{fieldErrors.phone}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.phone || "—"}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Email</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            id="patient-edit-email"
                                            type="email"
                                            value={editedPatient.email || ""}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, email: e.target.value })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                        />
                                        {fieldErrors.email && <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.email || "—"}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Insurance Provider</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            id="patient-edit-insurance_provider"
                                            type="text"
                                            value={editedPatient.insuranceType || ""}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, insuranceType: e.target.value })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                        />
                                        {fieldErrors.insurance_provider && <p className="mt-1 text-sm text-red-500">{fieldErrors.insurance_provider}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.insuranceType || "—"}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Policy Number</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            id="patient-edit-insurance_policy_number"
                                            type="text"
                                            value={editedPatient.insuranceId || ""}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, insuranceId: e.target.value })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                        />
                                        {fieldErrors.insurance_policy_number && <p className="mt-1 text-sm text-red-500">{fieldErrors.insurance_policy_number}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.insuranceId || "—"}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Member ID</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            id="patient-edit-insurance_member_id"
                                            type="text"
                                            value={editedPatient.insurance_member_id || ""}
                                            onChange={(e) => setEditedPatient({ ...editedPatient, insurance_member_id: e.target.value })}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                        />
                                        {fieldErrors.insurance_member_id && <p className="mt-1 text-sm text-red-500">{fieldErrors.insurance_member_id}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.insurance_member_id || "—"}</p>
                                )}
                            </div>
                            <div className="md:col-span-3">
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Address</p>
                                {editMode && editedPatient ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                        <div>
                                            <input
                                                id="patient-edit-address_street"
                                                type="text"
                                                placeholder="Street"
                                                value={editedPatient.address_street || ""}
                                                onChange={(e) => setEditedPatient({ ...editedPatient, address_street: e.target.value })}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                            />
                                            {fieldErrors.address_street && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_street}</p>}
                                        </div>
                                        <div>
                                            <input
                                                id="patient-edit-address_city"
                                                type="text"
                                                placeholder="City"
                                                value={editedPatient.address_city || ""}
                                                onChange={(e) => setEditedPatient({ ...editedPatient, address_city: e.target.value })}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                            />
                                            {fieldErrors.address_city && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_city}</p>}
                                        </div>
                                        <div>
                                            <input
                                                id="patient-edit-address_state"
                                                type="text"
                                                placeholder="State"
                                                value={editedPatient.address_state || ""}
                                                onChange={(e) => setEditedPatient({ ...editedPatient, address_state: e.target.value })}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                            />
                                            {fieldErrors.address_state && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_state}</p>}
                                        </div>
                                        <div>
                                            <input
                                                id="patient-edit-address_zip"
                                                type="text"
                                                placeholder="ZIP"
                                                value={editedPatient.address_zip || ""}
                                                onChange={(e) => setEditedPatient({ ...editedPatient, address_zip: e.target.value })}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                            />
                                            {fieldErrors.address_zip && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_zip}</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-900 font-medium">
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
                        <h2 className="text-xl font-semibold text-slate-900">Encounters History</h2>
                        {canManageEncounters && (
                            <Link
                                href={`/dashboard/encounters/create?patientId=${patientId}`}
                                className="brand-button-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-sm"
                            >
                                + Start New Encounter
                            </Link>
                        )}
                    </div>

                    {encounters.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                            <p className="text-slate-500">No encounters recorded for this patient.</p>
                            {canManageEncounters && (
                                <Link
                                    href={`/dashboard/encounters/create?patientId=${patientId}`}
                                    className="mt-2 inline-block font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                                >
                                    Start the first encounter
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full table-fixed divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="w-1/3 px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {encounters.map((encounter) => (
                                        <tr key={encounter.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {new Date(encounter.date_of_service).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${encounter.status === "completed"
                                                        ? "bg-green-100 text-green-800"
                                                        : encounter.status === "ready"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : encounter.status === "in_progress"
                                                                ? "bg-yellow-100 text-yellow-800"
                                                                : "bg-gray-100 text-gray-800"
                                                        }`}
                                                >
                                                    {encounter.status === "ready"
                                                        ? "Ready"
                                                        : encounter.status === "completed"
                                                            ? "Completed"
                                                            : encounter.status?.replace("_", " ") || "Draft"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {canManageEncounters ? (
                                                    <>
                                                        {encounter.status === "ready" || encounter.status === "completed" ? (
                                                            <Link
                                                                href={`/dashboard/encounters/${encounter.id}`}
                                                                className="font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                                                            >
                                                                View
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                href={`/dashboard/encounters/create?id=${encounter.id}&step=${getContinueStep(encounter)}`}
                                                                className="font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                                                            >
                                                                Continue →
                                                            </Link>
                                                        )}
                                                        <button
                                                            type="button"
                                                            aria-label="Delete encounter"
                                                            onClick={() => handleDelete(encounter.id)}
                                                            className="ml-4 text-slate-400 hover:text-red-600 disabled:opacity-50"
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
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">No encounter access</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
