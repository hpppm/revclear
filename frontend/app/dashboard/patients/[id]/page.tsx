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
import { toast } from "sonner";

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
    const { canReadPatients, canWritePatients, canManageEncounters } = useAuthorization();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editedPatient, setEditedPatient] = useState<Patient | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [fieldSaving, setFieldSaving] = useState(false);

    // Track the last patientId fetched to prevent double-fetch.
    // React 18 Strict Mode remounts with restored refs, so this ref remains set
    // on the second mount and blocks the duplicate request. On real navigation
    // to a different patient, patientId !== fetchedPatientIdRef.current so the
    // fetch runs correctly.
    const fetchedPatientIdRef = useRef<string | null>(null);
    const saveErrorRef = useRef<HTMLDivElement>(null);
    const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const fieldErrorsRef = useRef<Record<string, string>>({});
    const [scrollTrigger, setScrollTrigger] = useState(0);

    useEffect(() => { fieldErrorsRef.current = fieldErrors; }, [fieldErrors]);

    useEffect(() => {
        if (scrollTrigger === 0) return;
        const order = ["dob", "phone", "email", "insurance_provider", "insurance_policy_number", "insurance_member_id"];
        const errs = fieldErrorsRef.current;
        const firstKey = order.find((k) => errs[k]);
        setTimeout(() => {
            if (firstKey && fieldRefs.current[firstKey]) {
                fieldRefs.current[firstKey]!.scrollIntoView({ behavior: "smooth", block: "center" });
            } else if (saveErrorRef.current) {
                saveErrorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 50);
    }, [scrollTrigger]);

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
            // null → undefined: Zod's .optional() accepts undefined but not null;
            // DB returns null for unset columns which would cause an invalid_union error
            insurance_policy_number: editedPatient.insuranceId ?? undefined,
            insurance_member_id: editedPatient.insurance_member_id ?? undefined,
            insurance_group_number: editedPatient.insurance_group_number ?? undefined,
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
            setScrollTrigger((n) => n + 1);
            return;
        }
        setFieldErrors({});
        setSaveError(null);

        setSaving(true);
        try {
            const nullIfEmpty = (v: string | null | undefined): string | undefined =>
                v === "" || v == null ? undefined : v;
            await apiClient.patients.update(patientId, {
                full_name: editedPatient.name,
                dob: nullIfEmpty(editedPatient.dob),
                gender: editedPatient.gender,
                phone: nullIfEmpty(editedPatient.phone),
                email: nullIfEmpty(editedPatient.email),
                address_street: nullIfEmpty(editedPatient.address_street),
                address_city: nullIfEmpty(editedPatient.address_city),
                address_state: nullIfEmpty(editedPatient.address_state),
                address_zip: nullIfEmpty(editedPatient.address_zip),
                insurance_provider: nullIfEmpty(editedPatient.insuranceType),
                insurance_policy_number: nullIfEmpty(editedPatient.insuranceId),
                insurance_member_id: nullIfEmpty(editedPatient.insurance_member_id),
                insurance_group_number: nullIfEmpty(editedPatient.insurance_group_number),
            });
            setPatient(editedPatient);
            setEditMode(false);
            toast.success("Patient updated successfully");
        } catch (err) {
            logger.error("Failed to update patient", err);
            setSaveError("Failed to update patient");
            toast.error("Failed to update patient");
        } finally {
            setSaving(false);
        }
    };

    const clearFieldError = (field: string) => {
        if (fieldErrors[field]) {
            setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
        }
    };

    const handleCancel = () => {
        setEditedPatient(patient);
        setFieldErrors({});
        setEditMode(false);
    };

    const handleFieldSave = async (value: string) => {
        setFieldSaving(true);
        try {
            await apiClient.patients.update(patientId, { full_name: value });
            setPatient((prev) => prev ? { ...prev, name: value } : prev);
            setEditedPatient((prev) => prev ? { ...prev, name: value } : prev);
            setEditingField(null);
        } catch (err) {
            logger.error('Failed to save field', err);
            setSaveError('Failed to save. Please try again.');
        } finally {
            setFieldSaving(false);
        }
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
        setConfirmDeleteId(null);
        try {
            await apiClient.encounters.delete(id);
            setEncounters((prev) => prev.filter((e) => e.id !== id));
            toast.success("Encounter deleted");
        } catch (err) {
            logger.error("Failed to delete encounter", err);
            toast.error("Failed to delete encounter");
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

            {/* Delete confirmation modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-base font-semibold text-slate-900 mb-2">Delete encounter?</h3>
                        <p className="text-sm text-slate-500 mb-6">This cannot be undone. The encounter and all associated data will be permanently deleted.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmDeleteId(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(confirmDeleteId)} disabled={!!deletingId} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition">
                                {deletingId ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    <div className="flex items-center gap-2">
                                        {editingField === 'name' ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    className="text-3xl font-bold text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent w-64"
                                                    maxLength={100}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleFieldSave(editingValue)}
                                                    disabled={fieldSaving}
                                                    className="text-green-600 hover:text-green-700 disabled:opacity-50"
                                                    title="Save name"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setEditingField(null)}
                                                    disabled={fieldSaving}
                                                    className="text-slate-400 hover:text-red-500 disabled:opacity-50"
                                                    title="Cancel"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h1 className="text-3xl font-bold text-slate-900">{patient.name}</h1>
                                                {!editMode && (
                                                    <button
                                                        onClick={() => { setEditingField('name'); setEditingValue(patient.name); }}
                                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Edit name"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <p className="text-slate-500 mt-1">Patient Profile</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!editMode && canWritePatients ? (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="brand-button-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Edit Profile
                                    </button>
                                ) : editMode ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="brand-button-primary px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-50"
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
                                            <div ref={saveErrorRef}>
                                                <p className="text-sm text-red-600 mt-1">{saveError}</p>
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div ref={(el) => { fieldRefs.current.dob = el; }}>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Date of Birth</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            type="date"
                                            value={editedPatient.dob || ""}
                                            min="1900-01-01"
                                            max={new Date().toISOString().split("T")[0]}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, dob: e.target.value }); clearFieldError('dob'); }}
                                            className={`text-slate-900 font-medium border rounded px-2 py-1 ${fieldErrors.dob ? "border-red-500" : "border-slate-300"}`}
                                        />
                                        {fieldErrors.dob && <p className="mt-1 text-sm text-red-500">Required</p>}
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
                                            value={editedPatient.gender || "U"}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, gender: e.target.value as any }); clearFieldError('gender'); }}
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
                            <div ref={(el) => { fieldRefs.current.phone = el; }}>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Phone</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            type="tel"
                                            value={editedPatient.phone || ""}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, phone: e.target.value }); clearFieldError('phone'); }}
                                            className={`text-slate-900 font-medium border rounded px-2 py-1 w-full ${fieldErrors.phone ? "border-red-500" : "border-slate-300"}`}
                                            maxLength={15}
                                        />
                                        {fieldErrors.phone && <p className="mt-1 text-sm text-red-500">Required</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.phone || "—"}</p>
                                )}
                            </div>
                            <div ref={(el) => { fieldRefs.current.email = el; }}>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Email</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            type="email"
                                            value={editedPatient.email || ""}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, email: e.target.value }); clearFieldError('email'); }}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                            maxLength={254}
                                        />
                                        {fieldErrors.email && <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.email || "—"}</p>
                                )}
                            </div>
                            <div ref={(el) => { fieldRefs.current.insurance_provider = el; }}>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Insurance Provider</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editedPatient.insuranceType || ""}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, insuranceType: e.target.value }); clearFieldError('insurance_provider'); }}
                                            className={`text-slate-900 font-medium border rounded px-2 py-1 w-full ${fieldErrors.insurance_provider ? "border-red-500" : "border-slate-300"}`}
                                            maxLength={100}
                                        />
                                        {fieldErrors.insurance_provider && <p className="mt-1 text-sm text-red-500">Required</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.insuranceType || "—"}</p>
                                )}
                            </div>
                            <div ref={(el) => { fieldRefs.current.insurance_policy_number = el; }}>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Policy Number</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editedPatient.insuranceId || ""}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, insuranceId: e.target.value }); clearFieldError('insurance_policy_number'); }}
                                            className={`text-slate-900 font-medium border rounded px-2 py-1 w-full ${fieldErrors.insurance_policy_number ? "border-red-500" : "border-slate-300"}`}
                                            maxLength={50}
                                        />
                                        {fieldErrors.insurance_policy_number && <p className="mt-1 text-sm text-red-500">Required</p>}
                                    </>
                                ) : (
                                    <p className="text-slate-900 font-medium">{patient.insuranceId || "—"}</p>
                                )}
                            </div>
                            <div ref={(el) => { fieldRefs.current.insurance_member_id = el; }}>
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Member ID</p>
                                {editMode && editedPatient ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editedPatient.insurance_member_id || ""}
                                            onChange={(e) => { setEditedPatient({ ...editedPatient, insurance_member_id: e.target.value }); clearFieldError('insurance_member_id'); }}
                                            className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                            maxLength={50}
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
                                                type="text"
                                                placeholder="Street"
                                                value={editedPatient.address_street || ""}
                                                onChange={(e) => { setEditedPatient({ ...editedPatient, address_street: e.target.value }); clearFieldError('address_street'); }}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                                maxLength={200}
                                            />
                                            {fieldErrors.address_street && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_street}</p>}
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="City"
                                                value={editedPatient.address_city || ""}
                                                onChange={(e) => { setEditedPatient({ ...editedPatient, address_city: e.target.value }); clearFieldError('address_city'); }}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                                maxLength={100}
                                            />
                                            {fieldErrors.address_city && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_city}</p>}
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="State"
                                                value={editedPatient.address_state || ""}
                                                onChange={(e) => { setEditedPatient({ ...editedPatient, address_state: e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() }); clearFieldError('address_state'); }}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                                maxLength={2}
                                            />
                                            {fieldErrors.address_state && <p className="mt-1 text-sm text-red-500">{fieldErrors.address_state}</p>}
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="ZIP"
                                                value={editedPatient.address_zip || ""}
                                                onChange={(e) => { setEditedPatient({ ...editedPatient, address_zip: e.target.value.replace(/[^\d-]/g, "").slice(0, 10) }); clearFieldError('address_zip'); }}
                                                className="text-slate-900 font-medium border border-slate-300 rounded px-2 py-1 w-full"
                                                maxLength={10}
                                                inputMode="numeric"
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
                                className="brand-button-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Encounter
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
                                                    {encounter.status === "ready" ? "Ready" : encounter.status === "completed" ? "Completed" : encounter.status === "in_progress" ? "In Progress" : encounter.status === "ready_for_review" ? "Ready for Review" : encounter.status === "archived" ? "Archived" : encounter.status === "scheduled" ? "Scheduled" : "Draft"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {canManageEncounters ? (
                                                    <div className="inline-flex items-center justify-end gap-3">
                                                        {encounter.status === "ready" || encounter.status === "completed" ? (
                                                            <Link
                                                                href={`/dashboard/encounters/${encounter.id}`}
                                                                className="text-(--brand-600) hover:text-(--brand-700) font-semibold"
                                                            >
                                                                View
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                href={`/dashboard/encounters/create?id=${encounter.id}&step=${getContinueStep(encounter)}`}
                                                                className="text-(--brand-600) hover:text-(--brand-700) font-semibold"
                                                            >
                                                                Continue
                                                            </Link>
                                                        )}
                                                        <button
                                                            type="button"
                                                            aria-label="Delete encounter"
                                                            onClick={() => setConfirmDeleteId(encounter.id)}
                                                            className="inline-flex items-center text-slate-400 hover:text-red-600 disabled:opacity-50"
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
                                                    </div>
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
