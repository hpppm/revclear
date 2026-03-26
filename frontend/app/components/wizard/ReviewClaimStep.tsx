import { useEffect, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Input from "../ui/Input";

interface ReviewClaimStepProps {
    encounterId: string | null;
    onClaimChange?: (claim: any) => void;
    onValidationChange?: (isValid: boolean) => void;
}

export default function ReviewClaimStep({
    encounterId,
    onClaimChange,
    onValidationChange,
}: ReviewClaimStepProps) {
    const [claim, setClaim] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [_prefilling, setPrefilling] = useState(false);

    useEffect(() => {
        if (encounterId) {
            fetchClaimPreview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encounterId]);

    const fetchClaimPreview = async () => {
        if (!encounterId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.encounters.previewClaim(encounterId);
            const preview = res.data.data;
            setClaim(preview);
            onClaimChange?.(preview);
            updateValidation(preview);
            await hydrateWithDefaults(preview);
        } catch {
            logger.error("Failed to build claim preview");
            setError("Failed to build claim preview. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateClaim = (field: string, value: any) => {
        setClaim((prev: any) => {
            return { ...prev, [field]: value };
        });
    };

    const handleUpdateNested = (parent: string, field: string, value: any) => {
        setClaim((prev: any) => {
            return {
                ...prev,
                [parent]: { ...(prev?.[parent] || {}), [field]: value }
            };
        });
    };

    const handleUpdateLineItem = (index: number, field: string, value: any) => {
        setClaim((prev: any) => {
            const newLineItems = [...(prev.line_items || [])];
            newLineItems[index] = { ...newLineItems[index], [field]: value };

            // Recalculate total
            const newTotal = newLineItems.reduce((sum: number, item: any) => sum + Number(item.charge_amount || 0), 0);

            return { ...prev, line_items: newLineItems, total_amount: newTotal };
        });
    };

    // Effect to call callbacks when claim changes
    useEffect(() => {
        if (claim) {
            onClaimChange?.(claim);
            updateValidation(claim);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claim]);

    const parsePointerList = (value: string) =>
        value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v) => Number(v))
            .filter((n) => !Number.isNaN(n));

    const handleUpdateLineItemPointers = (index: number, value: string) => {
        handleUpdateLineItem(index, "diagnosis_pointers", parsePointerList(value));
    };

    const handleUpdateLineItemModifiers = (index: number, value: string) => {
        const mods = value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        handleUpdateLineItem(index, "modifiers", mods);
    };

    const requiredAddressMissing = (addressObj: any) => {
        if (!addressObj) return true;
        // If backend sends a combined address string and it is non-empty, treat it as present.
        if (typeof addressObj === "string") {
            return addressObj.trim().length === 0;
        }
        if (typeof addressObj !== "object") return true;
        const { street, city, state, zip } = addressObj as any;
        return !street || !city || !state || !zip;
    };

    const updateValidation = (current: any) => {
        const errs: string[] = [];
        if (!current) {
            setValidationErrors(errs);
            onValidationChange?.(false);
            return;
        }

        const hasCpt = (current.procedure_codes?.length || 0) > 0
            || (current.line_items || []).some((li: any) => li.procedure_code);
        if (!hasCpt) errs.push("At least one CPT/procedure code is required.");

        if (!current.rendering_provider?.npi) {
            errs.push("Rendering provider NPI is required.");
        }

        const rel = current.subscriber_relationship || current.subscriber?.relationship;
        const needsSubscriber = rel && rel !== "self";
        if (needsSubscriber) {
            const sub = current.subscriber || {};
            if (!sub.full_name || !sub.dob || !sub.gender) {
                errs.push("Subscriber name, DOB, and gender are required when relationship is not self.");
            }
            const subAddress = sub.address || {
                street: sub.address_street,
                city: sub.address_city,
                state: sub.address_state,
                zip: sub.address_zip,
            };
            if (requiredAddressMissing(subAddress)) {
                errs.push("Subscriber address is required when relationship is not self.");
            }
            if (!sub.member_id || !sub.group_number) {
                errs.push("Subscriber member and group numbers are required when relationship is not self.");
            }
        }

        if (requiredAddressMissing(current.billing_provider?.address || current.billing_provider)) {
            errs.push("Billing provider address (street, city, state, ZIP) is required.");
        }
        if (requiredAddressMissing(current.service_facility?.address || current.service_facility)) {
            errs.push("Service facility address (street, city, state, ZIP) is required.");
        }

        const hasServiceDate = current.service_date_start || current.service_date_end || current.date_of_service;
        if (!hasServiceDate) {
            errs.push("Date of service start/end is required.");
        }

        const icdPointersMissing = (current.line_items || []).some(
            (li: any) => (li.procedure_code || hasCpt) && (!li.diagnosis_pointers || li.diagnosis_pointers.length === 0)
        );
        if (icdPointersMissing) {
            errs.push("ICD diagnosis pointers are required on each service line with a CPT code.");
        }

        const hasNegativeCharge = (current.line_items || []).some(
            (li: any) => li.procedure_code && Number(li.charge_amount) <= 0
        );
        if (hasNegativeCharge) {
            errs.push("Charge amount must be greater than 0 on each service line.");
        }

        setValidationErrors(errs);
        onValidationChange?.(errs.length === 0);
    };

    const hydrateWithDefaults = async (preview: any) => {
        if (!preview) return;
        setPrefilling(true);
        try {
            const [meResp, patientResp, subscriberResp] = await Promise.allSettled([
                apiClient.me.getProfile(),
                preview.patient_id ? apiClient.patients.getById(preview.patient_id) : Promise.resolve(null),
                preview.patient_id ? apiClient.patients.getSubscriber(preview.patient_id) : Promise.resolve(null),
            ]);

            const profile: any = meResp.status === "fulfilled" ? (meResp.value.data?.data || meResp.value.data || meResp.value) : null;
            const patient: any =
                patientResp.status === "fulfilled" && patientResp.value
                    ? (patientResp.value.data?.data || patientResp.value.data || patientResp.value)
                    : null;
            const subscriber: any =
                subscriberResp.status === "fulfilled" && subscriberResp.value
                    ? (subscriberResp.value.data?.data || subscriberResp.value.data || subscriberResp.value)
                    : null;

            const mergeIfMissing = (target: any, source: any, keys: string[]) => {
                if (!source) return;
                keys.forEach((key) => {
                    if (target[key] === undefined || target[key] === null || target[key] === "") {
                        target[key] = source[key];
                    }
                });
            };

            const next = { ...preview };

            // Default DOS to encounter date if missing
            if (!next.service_date_start && next.date_of_service) {
                next.service_date_start = next.date_of_service?.split("T")[0] || next.date_of_service;
            }
            if (!next.service_date_end && next.service_date_start) {
                next.service_date_end = next.service_date_start;
            }

            // Billing provider defaults from organization (profile.organization)
            next.billing_provider = { ...(next.billing_provider || {}) };
            const org = profile?.organization || {};

            if (!next.billing_provider.name && org.billing_name) next.billing_provider.name = org.billing_name;
            if (!next.billing_provider.npi && org.billing_npi) next.billing_provider.npi = org.billing_npi;
            if (!next.billing_provider.organization_npi && org.npi) next.billing_provider.organization_npi = org.npi; // Fallback or Type 2
            if (!next.billing_provider.tax_id && org.billing_tax_id) next.billing_provider.tax_id = org.billing_tax_id;
            if (!next.billing_provider.phone && org.billing_phone) next.billing_provider.phone = org.billing_phone;
            if (!next.billing_provider.taxonomy_code) {
                // Organization usually doesn't have a taxonomy unless specified, defaulting to user's if solo or blank
                // next.billing_provider.taxonomy_code = ... 
            }

            // Map billing address
            if (!next.billing_provider.street && org.billing_address_line1) {
                let s = org.billing_address_line1;
                if (org.billing_address_line2) s += `, ${org.billing_address_line2}`;
                next.billing_provider.street = s;
            }

            if (!next.billing_provider.city && org.billing_city) next.billing_provider.city = org.billing_city;
            if (!next.billing_provider.state && org.billing_state) next.billing_provider.state = org.billing_state;
            if (!next.billing_provider.zip && org.billing_postal_code) next.billing_provider.zip = org.billing_postal_code;

            if (!next.billing_provider.address) {
                next.billing_provider.address = {
                    street: next.billing_provider.street,
                    city: next.billing_provider.city,
                    state: next.billing_provider.state,
                    zip: next.billing_provider.zip,
                };
            }

            // Rendering provider defaults from clinician profile (user)
            next.rendering_provider = { ...(next.rendering_provider || {}) };
            if (!next.rendering_provider.name && profile?.full_name) next.rendering_provider.name = profile.full_name;
            if (!next.rendering_provider.npi && profile?.npi) next.rendering_provider.npi = profile.npi;
            if (!next.rendering_provider.taxonomy_code && profile?.taxonomy_code) next.rendering_provider.taxonomy_code = profile.taxonomy_code;

            // Service facility defaults: Prioritize General Information (org.name, etc.)
            next.service_facility = { ...(next.service_facility || {}) };

            // Name: General -> Billing
            if (!next.service_facility.name && org.name) next.service_facility.name = org.name;
            else if (!next.service_facility.name && org.billing_name) next.service_facility.name = org.billing_name;

            // NPI: General -> Billing
            if (!next.service_facility.npi && org.npi) next.service_facility.npi = org.npi;
            else if (!next.service_facility.npi && org.billing_npi) next.service_facility.npi = org.billing_npi;

            // POS
            if (!next.service_facility.place_of_service && org.default_place_of_service) next.service_facility.place_of_service = org.default_place_of_service;

            // Address: General -> Billing
            if (!next.service_facility.street && org.address_line1) {
                let s = org.address_line1;
                if (org.address_line2) s += `, ${org.address_line2}`;
                next.service_facility.street = s;
            } else if (!next.service_facility.street && org.billing_address_line1) {
                let s = org.billing_address_line1;
                if (org.billing_address_line2) s += `, ${org.billing_address_line2}`;
                next.service_facility.street = s;
            }

            // City
            if (!next.service_facility.city && org.city) next.service_facility.city = org.city;
            else if (!next.service_facility.city && org.billing_city) next.service_facility.city = org.billing_city;

            // State
            if (!next.service_facility.state && org.state) next.service_facility.state = org.state;
            else if (!next.service_facility.state && org.billing_state) next.service_facility.state = org.billing_state;

            // Zip
            if (!next.service_facility.zip && org.postal_code) next.service_facility.zip = org.postal_code;
            else if (!next.service_facility.zip && org.billing_postal_code) next.service_facility.zip = org.billing_postal_code;

            // Phone
            if (!next.service_facility.phone && org.phone) next.service_facility.phone = org.phone;
            else if (!next.service_facility.phone && org.billing_phone) next.service_facility.phone = org.billing_phone;

            if (!next.service_facility.address) {
                next.service_facility.address = {
                    street: next.service_facility.street,
                    city: next.service_facility.city,
                    state: next.service_facility.state,
                    zip: next.service_facility.zip,
                };
            }

            // Subscriber defaults from patient/subscriber records
            if (!next.subscriber_relationship && patient?.insurance_relationship) {
                next.subscriber_relationship = patient.insurance_relationship;
            }

            // If relationship is self, ensure patient details are used if subscriber record is missing/empty
            if (next.subscriber_relationship === 'self' && patient) {
                if (!next.subscriber) next.subscriber = {};
                if (!next.subscriber.full_name) next.subscriber.full_name = patient.name;
                if (!next.subscriber.dob) next.subscriber.dob = patient.dob;
                if (!next.subscriber.gender) next.subscriber.gender = patient.gender;
                if (!next.subscriber.member_id) next.subscriber.member_id = patient.insurance_member_id || patient.insuranceId;
                if (!next.subscriber.group_number) next.subscriber.group_number = patient.insurance_group_number;
                if (!next.subscriber.address_street) next.subscriber.address_street = patient.address_street;
                if (!next.subscriber.address_city) next.subscriber.address_city = patient.address_city;
                if (!next.subscriber.address_state) next.subscriber.address_state = patient.address_state;
                if (!next.subscriber.address_zip) next.subscriber.address_zip = patient.address_zip;
            } else if (subscriber) {
                next.subscriber = { ...(next.subscriber || {}) };
                mergeIfMissing(next.subscriber, subscriber, [
                    "full_name",
                    "dob",
                    "gender",
                    "member_id",
                    "group_number",
                    "address_street",
                    "address_city",
                    "address_state",
                    "address_zip",
                ]);
            }

            setClaim(next);
            onClaimChange?.(next);
            updateValidation(next);
        } catch {
            logger.warn("Prefill failed");
        } finally {
            setPrefilling(false);
        }
    };

    if (!encounterId) {
        return (
            <div className="text-center py-8 text-slate-500">
                Please complete previous steps to build a claim preview.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-b-transparent" />
                <p className="text-slate-600 mt-4">Building claim preview...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4 text-red-700 border border-red-200">
                {error}
                <Button size="sm" variant="secondary" onClick={fetchClaimPreview} className="mt-2">
                    Retry
                </Button>
            </div>
        );
    }

    if (!claim) return null;

    const diagnosisCodes = claim.diagnosis_codes || [];
    const procedureCodes = claim.procedure_codes || [];

    const relationship = (claim.subscriber_relationship || claim.subscriber?.relationship || "self").toLowerCase();
    const isSelfSubscriber = relationship === "self";

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="space-y-2 text-center">
                <h2 className="text-3xl font-semibold text-slate-900">Review Claim</h2>
                <p className="text-slate-600 text-sm">Stacked, step-by-step review. Fix any blockers below.</p>
                <p className="text-xs text-slate-500">Changes save when you complete the encounter.</p>
            </div>

            {validationErrors.length > 0 && (
                <Card className="border border-red-200 bg-red-50 p-4">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">Fix before submitting</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                        {validationErrors.map((err, idx) => (
                            <li key={idx}>{err}</li>
                        ))}
                    </ul>
                </Card>
            )}

            <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Claim Meta</h3>
                    <p className="text-sm text-slate-600">Encounter, dates, payer, claim/ frequency codes.</p>
                </div>
                <div className="space-y-3">
                    <Input label="Encounter ID" value={claim.encounter_id || encounterId || ""} disabled className="bg-slate-50" />
                    <Input label="Patient ID" value={claim.patient_id || ""} disabled className="bg-slate-50" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Date of Service Start"
                            type="date"
                            value={claim.service_date_start || claim.date_of_service || ""}
                            onChange={(e) => handleUpdateClaim("service_date_start", e.target.value)}
                        />
                        <Input
                            label="Date of Service End"
                            type="date"
                            value={claim.service_date_end || claim.date_of_service || ""}
                            onChange={(e) => handleUpdateClaim("service_date_end", e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Claim Type</label>
                            <select
                                id="claim-type"
                                name="claim-type"
                                value={claim.claim_type || "professional"}
                                onChange={(e) => handleUpdateClaim("claim_type", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="professional">Professional (CMS-1500)</option>
                                <option value="institutional">Institutional (UB-04)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                                Submission Type (Claim Frequency)
                            </label>
                            <select
                                id="submission-type"
                                name="submission-type"
                                value={claim.submission_type || "initial"}
                                onChange={(e) => handleUpdateClaim("submission_type", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                                <option value="initial">Initial (1)</option>
                                <option value="corrected">Corrected (7)</option>
                                <option value="void">Void (8)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Payer Name"
                            value={claim.payer_name || ""}
                            onChange={(e) => handleUpdateClaim("payer_name", e.target.value)}
                        />
                        <Input
                            label="Payer ID"
                            value={claim.payer_id || ""}
                            onChange={(e) => handleUpdateClaim("payer_id", e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {!isSelfSubscriber && (
                <Card className="p-6 space-y-6">
                    <div className="border-b border-slate-200 pb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Subscriber Information</h3>
                        <p className="text-sm text-slate-600">Required when patient is not the subscriber.</p>
                    </div>
                    <div className="space-y-3">
                        <Input
                            label="Relationship"
                            value={relationship}
                            onChange={(e) => handleUpdateClaim("subscriber_relationship", e.target.value)}
                            placeholder="self / spouse / child / other"
                        />
                        <Input
                            label="Subscriber Name"
                            value={claim.subscriber?.full_name || ""}
                            onChange={(e) => handleUpdateNested("subscriber", "full_name", e.target.value)}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                label="Subscriber DOB"
                                type="date"
                                value={claim.subscriber?.dob || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "dob", e.target.value)}
                            />
                            <Input
                                label="Gender"
                                value={claim.subscriber?.gender || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "gender", e.target.value)}
                                placeholder="M / F / U / O"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                label="Member ID"
                                value={claim.subscriber?.member_id || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "member_id", e.target.value)}
                            />
                            <Input
                                label="Group Number"
                                value={claim.subscriber?.group_number || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "group_number", e.target.value)}
                            />
                        </div>
                        <Input
                            label="Address Street"
                            value={claim.subscriber?.address_street || claim.subscriber?.address?.street || ""}
                            onChange={(e) => handleUpdateNested("subscriber", "address_street", e.target.value)}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                                label="City"
                                value={claim.subscriber?.address_city || claim.subscriber?.address?.city || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "address_city", e.target.value)}
                            />
                            <Input
                                label="State"
                                value={claim.subscriber?.address_state || claim.subscriber?.address?.state || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "address_state", e.target.value)}
                            />
                            <Input
                                label="ZIP"
                                value={claim.subscriber?.address_zip || claim.subscriber?.address?.zip || ""}
                                onChange={(e) => handleUpdateNested("subscriber", "address_zip", e.target.value)}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {isSelfSubscriber && (
                <Card className="p-4 border border-green-200 bg-green-50 text-green-800">
                    Subscriber is Patient (Relationship: Self). Using patient details for subscriber information.
                </Card>
            )}

            <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Billing Provider</h3>
                    <p className="text-sm text-slate-600">Solo or organization billing details.</p>
                </div>
                <div className="space-y-3">
                    <Input
                        label="Billing Provider Name"
                        value={claim.billing_provider?.name || ""}
                        onChange={(e) => handleUpdateNested("billing_provider", "name", e.target.value)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="NPI (Type 1)"
                            value={claim.billing_provider?.npi || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "npi", e.target.value)}
                        />
                        <Input
                            label="Organization NPI (Type 2, optional)"
                            value={claim.billing_provider?.organization_npi || claim.billing_provider?.clinic_npi || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "organization_npi", e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Tax ID"
                            value={claim.billing_provider?.tax_id || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "tax_id", e.target.value)}
                        />
                        <Input
                            label="Phone (optional)"
                            value={claim.billing_provider?.phone || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "phone", e.target.value)}
                        />
                    </div>
                    <Input
                        label="Taxonomy Code"
                        value={claim.billing_provider?.taxonomy_code || ""}
                        onChange={(e) => handleUpdateNested("billing_provider", "taxonomy_code", e.target.value)}
                    />
                    <Input
                        label="Address Street"
                        value={claim.billing_provider?.street || claim.billing_provider?.address?.street || ""}
                        onChange={(e) => handleUpdateNested("billing_provider", "street", e.target.value)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="City"
                            value={claim.billing_provider?.city || claim.billing_provider?.address?.city || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "city", e.target.value)}
                        />
                        <Input
                            label="State"
                            value={claim.billing_provider?.state || claim.billing_provider?.address?.state || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "state", e.target.value)}
                        />
                        <Input
                            label="ZIP"
                            value={claim.billing_provider?.zip || claim.billing_provider?.address?.zip || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "zip", e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Service Facility</h3>
                    <p className="text-sm text-slate-600">Where the service occurred.</p>
                </div>
                <div className="space-y-3">
                    <Input
                        label="Facility Name"
                        value={claim.service_facility?.name || ""}
                        onChange={(e) => handleUpdateNested("service_facility", "name", e.target.value)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            label="Facility NPI"
                            value={claim.service_facility?.npi || ""}
                            onChange={(e) => handleUpdateNested("service_facility", "npi", e.target.value)}
                        />
                        <Input
                            label="Place of Service (POS)"
                            value={claim.service_facility?.place_of_service || "11"}
                            onChange={(e) => handleUpdateNested("service_facility", "place_of_service", e.target.value)}
                        />
                    </div>
                    <Input
                        label="Phone (optional)"
                        value={claim.service_facility?.phone || ""}
                        onChange={(e) => handleUpdateNested("service_facility", "phone", e.target.value)}
                    />
                    <Input
                        label="Address Street"
                        value={claim.service_facility?.street || claim.service_facility?.address?.street || ""}
                        onChange={(e) => handleUpdateNested("service_facility", "street", e.target.value)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="City"
                            value={claim.service_facility?.city || claim.service_facility?.address?.city || ""}
                            onChange={(e) => handleUpdateNested("service_facility", "city", e.target.value)}
                        />
                        <Input
                            label="State"
                            value={claim.service_facility?.state || claim.service_facility?.address?.state || ""}
                            onChange={(e) => handleUpdateNested("service_facility", "state", e.target.value)}
                        />
                        <Input
                            label="ZIP"
                            value={claim.service_facility?.zip || claim.service_facility?.address?.zip || ""}
                            onChange={(e) => handleUpdateNested("service_facility", "zip", e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Rendering Provider</h3>
                    <p className="text-sm text-slate-600">Who performed the service (required).</p>
                </div>
                <div className="space-y-3">
                    <Input
                        label="Rendering Provider Name"
                        value={claim.rendering_provider?.name || claim.billing_provider?.name || ""}
                        onChange={(e) => handleUpdateNested("rendering_provider", "name", e.target.value)}
                    />
                    <Input
                        label="Rendering Provider NPI"
                        value={claim.rendering_provider?.npi || ""}
                        onChange={(e) => handleUpdateNested("rendering_provider", "npi", e.target.value)}
                        helperText="Required"
                    />
                    <Input
                        label="Taxonomy Code"
                        value={claim.rendering_provider?.taxonomy_code || ""}
                        onChange={(e) => handleUpdateNested("rendering_provider", "taxonomy_code", e.target.value)}
                    />
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                    <h3 className="text-lg font-semibold text-slate-900">Codes Summary</h3>
                    <p className="text-sm text-slate-600">ICDs (diagnosis) and CPTs (procedure) in this claim.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">ICD-10 (Diagnosis)</p>
                        <div className="flex flex-wrap gap-2">
                            {diagnosisCodes.length > 0 ? (
                                diagnosisCodes.map((code: string, idx: number) => (
                                    <Badge key={`icd-${idx}`} variant="neutral">
                                        {code}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 italic">No diagnosis codes</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">CPT (Procedures)</p>
                        <div className="flex flex-wrap gap-2">
                            {procedureCodes.length > 0 ? (
                                procedureCodes.map((code: string, idx: number) => (
                                    <Badge key={`cpt-${idx}`} variant="info">
                                        {code}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 italic">No procedure codes</p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Service Lines</h3>
                        <p className="text-xs text-slate-500">Codes, ICD pointers, modifiers, units, charges.</p>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">
                        ${Number(claim.total_amount || 0).toFixed(2)}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 w-16">#</th>
                                <th className="px-4 py-3 w-32">CPT Code</th>
                                <th className="px-4 py-3">Description</th>
                                <th className="px-4 py-3 w-32">ICD Pointers</th>
                                <th className="px-4 py-3 w-32">Modifiers</th>
                                <th className="px-4 py-3 w-24 text-right">Units</th>
                                <th className="px-4 py-3 w-32 text-right">Charge ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {claim.line_items?.map((item: any, index: number) => (
                                <tr key={index} className="bg-white">
                                    <td className="px-4 py-3 text-slate-500">{item.line_number}</td>
                                    <td className="px-4 py-3">
                                        <Input
                                            value={item.procedure_code}
                                            onChange={(e) => handleUpdateLineItem(index, "procedure_code", e.target.value)}
                                            className="font-mono"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input
                                            value={item.description || ""}
                                            onChange={(e) => handleUpdateLineItem(index, "description", e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input
                                            value={(item.diagnosis_pointers || []).join(", ")}
                                            onChange={(e) => handleUpdateLineItemPointers(index, e.target.value)}
                                            placeholder="1,2"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Input
                                            value={(item.modifiers || []).join(", ")}
                                            onChange={(e) => handleUpdateLineItemModifiers(index, e.target.value)}
                                            placeholder="25,59"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Input
                                            type="number"
                                            value={item.units}
                                            onChange={(e) => handleUpdateLineItem(index, "units", Number(e.target.value))}
                                            className="text-right"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Input
                                            type="number"
                                            value={item.charge_amount}
                                            onChange={(e) => handleUpdateLineItem(index, "charge_amount", Number(e.target.value))}
                                            className="text-right"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="flex justify-end">
                <p className="text-xs text-slate-500">
                    * Claim remains a preview until you complete the encounter.
                </p>
            </div>
        </div>
    );
}
