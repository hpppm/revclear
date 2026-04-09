import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/app/lib/api/apiClient";
import { useAuth } from "@/app/context/AuthContext";
import logger from "@/app/lib/logger";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Input from "../ui/Input";

type ClaimAddress = { street?: string; city?: string; state?: string; zip?: string };
type ClaimLineItem = {
  procedure_code?: string;
  description?: string;
  charge_amount?: number | string;
  units?: number | string;
  line_number?: number | string;
  diagnosis_pointers?: number[];
  modifiers?: string[];
  [key: string]: unknown;
};
type ClaimProvider = {
  name?: string; npi?: string; tax_id?: string; phone?: string;
  taxonomy_code?: string; organization_npi?: string; clinic_npi?: string;
  street?: string; city?: string; state?: string; zip?: string;
  address?: ClaimAddress;
  place_of_service?: string;
  [key: string]: unknown;
};
type ClaimSubscriber = {
  full_name?: string; dob?: string; gender?: string; relationship?: string;
  member_id?: string; group_number?: string;
  address?: ClaimAddress;
  address_street?: string; address_city?: string; address_state?: string; address_zip?: string;
  [key: string]: unknown;
};
type ClaimData = {
  procedure_codes?: string[];
  diagnosis_codes?: string[];
  line_items?: ClaimLineItem[];
  total_amount?: number;
  billing_provider?: ClaimProvider;
  service_facility?: ClaimProvider;
  rendering_provider?: ClaimProvider;
  subscriber?: ClaimSubscriber;
  subscriber_relationship?: string;
  service_date_start?: string;
  service_date_end?: string;
  date_of_service?: string;
  patient_id?: string;
  encounter_id?: string;
  patient_name?: string;
  claim_type?: string;
  submission_type?: string;
  payer_name?: string;
  payer_id?: string;
  insurance_policy_number?: string;
  [key: string]: unknown;
};

interface ReviewClaimStepProps {
    encounterId: string | null;
    onClaimChange?: (claim: Record<string, unknown>) => void;
    onValidationChange?: (isValid: boolean) => void;
    submitAttempt?: number;
}

export default function ReviewClaimStep({
    encounterId,
    onClaimChange,
    onValidationChange,
    submitAttempt,
}: ReviewClaimStepProps) {
    const billingNameRef = useRef<HTMLDivElement>(null);
    const billingNpiRef = useRef<HTMLDivElement>(null);
    const billingTaxIdRef = useRef<HTMLDivElement>(null);
    const billingStreetRef = useRef<HTMLDivElement>(null);
    const billingCityRef = useRef<HTMLDivElement>(null);
    const billingStateRef = useRef<HTMLDivElement>(null);
    const billingZipRef = useRef<HTMLDivElement>(null);
    const serviceFacilityNameRef = useRef<HTMLDivElement>(null);
    const serviceFacilityNpiRef = useRef<HTMLDivElement>(null);
    const serviceStreetRef = useRef<HTMLDivElement>(null);
    const serviceCityRef = useRef<HTMLDivElement>(null);
    const serviceStateRef = useRef<HTMLDivElement>(null);
    const serviceZipRef = useRef<HTMLDivElement>(null);
    const renderingNameRef = useRef<HTMLDivElement>(null);
    const renderingNpiRef = useRef<HTMLDivElement>(null);
    const { user: authUser } = useAuth();
    const [claim, setClaim] = useState<ClaimData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const validationErrorsRef = useRef<string[]>([]);
    const [, setPrefilling] = useState(false);

    useEffect(() => {
        validationErrorsRef.current = validationErrors;
    }, [validationErrors]);

    useEffect(() => {
        if (encounterId) {
            fetchClaimPreview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [encounterId]);

    useEffect(() => {
        if (!submitAttempt || submitAttempt === 0) return;
        const errs = validationErrorsRef.current;
        if (errs.length === 0) return;
        // Ordered top-to-bottom on page
        const checks: [boolean, React.RefObject<HTMLDivElement | null>][] = [
            [errs.some((e) => e.includes("Billing provider name")), billingNameRef],
            [errs.some((e) => e.includes("Billing provider NPI")), billingNpiRef],
            [errs.some((e) => e.includes("Billing provider Tax ID")), billingTaxIdRef],
            [errs.some((e) => e.includes("Billing provider address")) && !billingStreetRef.current?.querySelector("input")?.value, billingStreetRef],
            [errs.some((e) => e.includes("Billing provider address")) && !billingCityRef.current?.querySelector("input")?.value, billingCityRef],
            [errs.some((e) => e.includes("Billing provider address")) && !billingStateRef.current?.querySelector("input")?.value, billingStateRef],
            [errs.some((e) => e.includes("Billing provider address")) && !billingZipRef.current?.querySelector("input")?.value, billingZipRef],
            [errs.some((e) => e.includes("Service facility name")), serviceFacilityNameRef],
            [errs.some((e) => e.includes("Service facility NPI")), serviceFacilityNpiRef],
            [errs.some((e) => e.includes("Service facility address")) && !serviceStreetRef.current?.querySelector("input")?.value, serviceStreetRef],
            [errs.some((e) => e.includes("Service facility address")) && !serviceCityRef.current?.querySelector("input")?.value, serviceCityRef],
            [errs.some((e) => e.includes("Service facility address")) && !serviceStateRef.current?.querySelector("input")?.value, serviceStateRef],
            [errs.some((e) => e.includes("Service facility address")) && !serviceZipRef.current?.querySelector("input")?.value, serviceZipRef],
            [errs.some((e) => e.includes("Rendering provider name")), renderingNameRef],
            [errs.some((e) => e.includes("Rendering provider NPI")), renderingNpiRef],
        ];
        const first = checks.find(([cond]) => cond);
        if (first) first[1].current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [submitAttempt]);


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

    const handleUpdateClaim = (field: string, value: unknown) => {
        setClaim((prev) => {
            if (!prev) return prev;
            return { ...prev, [field]: value };
        });
    };

    const handleUpdateNested = (parent: string, field: string, value: unknown) => {
        setClaim((prev) => {
            if (!prev) return prev;
            const parentVal = prev[parent];
            return {
                ...prev,
                [parent]: { ...(typeof parentVal === "object" && parentVal !== null ? parentVal : {}), [field]: value }
            };
        });
    };

    const handleUpdateLineItem = (index: number, field: string, value: unknown) => {
        setClaim((prev) => {
            if (!prev) return prev;
            const newLineItems = [...(prev.line_items || [])];
            newLineItems[index] = { ...newLineItems[index], [field]: value };

            // Recalculate total
            const newTotal = newLineItems.reduce((sum: number, item: ClaimLineItem) => sum + Number(item.charge_amount || 0), 0);

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

    const isValidNpiFormat = (v: string | undefined) => /^\d{10}$/.test((v || "").trim());
    const isValidTaxIdFormat = (v: string | undefined) => /^\d{2}-?\d{7}$/.test((v || "").replace(/\s/g, ""));
    const nameHasLetters = (v: string | undefined) => /[A-Za-z]/.test((v || "").trim()) && (v || "").trim().length >= 2;

    const requiredAddressMissing = (addressObj: ClaimAddress | string | null | undefined) => {
        if (!addressObj) return true;
        if (typeof addressObj === "string") {
            return addressObj.trim().length === 0;
        }
        const { street, city, state, zip } = addressObj;
        return !street || !city || !state || !zip;
    };

    const updateValidation = (current: ClaimData | null) => {
        const errs: string[] = [];
        if (!current) {
            setValidationErrors(errs);
            onValidationChange?.(false);
            return;
        }

        const hasCpt = (current.procedure_codes?.length || 0) > 0
            || (current.line_items || []).some((li: ClaimLineItem) => li.procedure_code);
        if (!hasCpt) errs.push("At least one CPT/procedure code is required.");

        const isValidZip = (v: string | undefined) => /^\d{5}(-\d{4})?$/.test((v || "").trim());
        const isValidState = (v: string | undefined) => /^[A-Za-z]{2}$/.test((v || "").trim());

        const nameError = (val: string | undefined, label: string) => {
            if (!val) return `${label} is required.`;
            if (!nameHasLetters(val)) return `${label} must contain letters (e.g. "Clinic Name").`;
            return null;
        };

        const billingNameErr = nameError(current.billing_provider?.name, "Billing provider name");
        if (billingNameErr) errs.push(billingNameErr);

        if (!current.billing_provider?.npi) {
            errs.push("Billing provider NPI is required.");
        } else if (!isValidNpiFormat(current.billing_provider.npi)) {
            errs.push("Billing provider NPI must be exactly 10 digits.");
        }
        if (!current.billing_provider?.tax_id) {
            errs.push("Billing provider Tax ID is required.");
        } else if (!isValidTaxIdFormat(current.billing_provider.tax_id)) {
            errs.push("Billing provider Tax ID must be in format XX-XXXXXXX.");
        }

        const renderingNameErr = nameError(current.rendering_provider?.name, "Rendering provider name");
        if (renderingNameErr) errs.push(renderingNameErr);

        if (!current.rendering_provider?.npi) {
            errs.push("Rendering provider NPI is required.");
        } else if (!isValidNpiFormat(current.rendering_provider.npi)) {
            errs.push("Rendering provider NPI must be exactly 10 digits.");
        }

        const facilityNameErr = nameError(current.service_facility?.name, "Service facility name");
        if (facilityNameErr) errs.push(facilityNameErr);

        if (!current.service_facility?.npi) {
            errs.push("Service facility NPI is required.");
        } else if (!isValidNpiFormat(current.service_facility.npi)) {
            errs.push("Service facility NPI must be exactly 10 digits.");
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

        const billingAddr = {
            street: current.billing_provider?.street || current.billing_provider?.address?.street,
            city: current.billing_provider?.city || current.billing_provider?.address?.city,
            state: current.billing_provider?.state || current.billing_provider?.address?.state,
            zip: current.billing_provider?.zip || current.billing_provider?.address?.zip,
        };
        if (requiredAddressMissing(billingAddr)) {
            errs.push("Billing provider address (street, city, state, ZIP) is required.");
        } else {
            if (billingAddr.zip && !isValidZip(billingAddr.zip)) errs.push("Billing provider ZIP must be 5 digits.");
            if (billingAddr.state && !isValidState(billingAddr.state)) errs.push("Billing provider state must be 2 letters.");
        }
        const serviceAddr = {
            street: current.service_facility?.street || current.service_facility?.address?.street,
            city: current.service_facility?.city || current.service_facility?.address?.city,
            state: current.service_facility?.state || current.service_facility?.address?.state,
            zip: current.service_facility?.zip || current.service_facility?.address?.zip,
        };
        if (requiredAddressMissing(serviceAddr)) {
            errs.push("Service facility address (street, city, state, ZIP) is required.");
        } else {
            if (serviceAddr.zip && !isValidZip(serviceAddr.zip)) errs.push("Service facility ZIP must be 5 digits.");
            if (serviceAddr.state && !isValidState(serviceAddr.state)) errs.push("Service facility state must be 2 letters.");
        }

        const hasServiceDate = current.service_date_start || current.service_date_end || current.date_of_service;
        if (!hasServiceDate) {
            errs.push("Date of service start/end is required.");
        }

        const icdPointersMissing = (current.line_items || []).some(
            (li: ClaimLineItem) => (li.procedure_code || hasCpt) && (!li.diagnosis_pointers || li.diagnosis_pointers.length === 0)
        );
        if (icdPointersMissing) {
            errs.push("ICD diagnosis pointers are required on each service line with a CPT code.");
        }

        const hasNegativeCharge = (current.line_items || []).some(
            (li: ClaimLineItem) => li.procedure_code && Number(li.charge_amount) <= 0
        );
        if (hasNegativeCharge) {
            errs.push("Charge amount must be greater than 0 on each service line.");
        }

        setValidationErrors(errs);
        onValidationChange?.(errs.length === 0);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hydrateWithDefaults = async (preview: any) => {
        if (!preview) return;
        setPrefilling(true);
        try {
            const [meResp, patientResp, subscriberResp] = await Promise.allSettled([
                apiClient.me.getProfile(),
                preview.patient_id ? apiClient.patients.getById(preview.patient_id) : Promise.resolve(null),
                preview.patient_id ? apiClient.patients.getSubscriber(preview.patient_id) : Promise.resolve(null),
            ]);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meData: any = meResp.status === "fulfilled" ? meResp.value.data : null;
            // /me returns { success, user: {...}, organization: {...} }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile: any = meData?.user ?? null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const patient: any =
                patientResp.status === "fulfilled" && patientResp.value
                    ? (patientResp.value.data?.data || patientResp.value.data || patientResp.value)
                    : null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const subscriber: any =
                subscriberResp.status === "fulfilled" && subscriberResp.value
                    ? (subscriberResp.value.data?.data || subscriberResp.value.data || subscriberResp.value)
                    : null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Billing provider defaults from organization
            next.billing_provider = { ...(next.billing_provider || {}) };
            const org = meData?.organization || {};

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

            // Rendering provider always comes from the logged-in clinician — use authUser
            // first (from JWT/DB via AuthContext), then fall back to /me profile
            const clinicianName = authUser?.full_name || authUser?.name || profile?.full_name;
            const clinicianNpi = profile?.npi;
            const clinicianTaxonomy = profile?.taxonomy_code;
            next.rendering_provider = {
                ...(next.rendering_provider || {}),
                ...(clinicianName ? { name: clinicianName } : {}),
                ...(clinicianNpi ? { npi: clinicianNpi } : {}),
                ...(clinicianTaxonomy ? { taxonomy_code: clinicianTaxonomy } : {}),
            };

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

            // Payer info from patient insurance record
            if (patient) {
                if (!next.payer_name) next.payer_name = patient.insurance_payer_name || patient.insurance_provider || null;
                if (!next.payer_id) next.payer_id = patient.insurance_payer_id || null;
                if (!next.insurance_provider) next.insurance_provider = patient.insurance_provider || null;
                // Always pull member_id and group_number from patient — regardless of relationship
                if (!next.subscriber) next.subscriber = {};
                if (!next.subscriber.member_id) next.subscriber.member_id = patient.insurance_member_id || null;
                if (!next.subscriber.group_number) next.subscriber.group_number = patient.insurance_group_number || null;
            }

            // Subscriber defaults from patient/subscriber records
            if (!next.subscriber_relationship && patient?.insurance_relationship) {
                next.subscriber_relationship = patient.insurance_relationship;
            }

            // If relationship is self, ensure patient details are used if subscriber record is missing/empty
            if ((next.subscriber_relationship === 'self' || !next.subscriber_relationship) && patient) {
                if (!next.subscriber) next.subscriber = {};
                if (!next.subscriber.full_name) next.subscriber.full_name = patient.name || patient.full_name;
                if (!next.subscriber.dob) next.subscriber.dob = patient.dob;
                if (!next.subscriber.gender) next.subscriber.gender = patient.gender;
                if (!next.subscriber.member_id) next.subscriber.member_id = patient.insurance_member_id || null;
                if (!next.subscriber.group_number) next.subscriber.group_number = patient.insurance_group_number || null;
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
            </div>

            {!!submitAttempt && submitAttempt > 0 && validationErrors.length > 0 && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input label="Patient ID" value={claim.patient_id || ""} disabled className="bg-slate-50" />
                        <Input label="Patient Name" value={claim.patient_name || ""} disabled className="bg-slate-50" />
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="Policy Number"
                            value={claim.insurance_policy_number || ""}
                            onChange={(e) => handleUpdateClaim("insurance_policy_number", e.target.value)}
                        />
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
                    <div ref={billingNameRef}>
                        <Input
                            label="Billing Provider Name *"
                            value={claim.billing_provider?.name || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "name", e.target.value)}
                            error={submitAttempt && submitAttempt > 0 ? (!claim.billing_provider?.name ? "Required" : !nameHasLetters(claim.billing_provider.name) ? "Must contain letters (e.g. \"Clinic Name\")" : undefined) : undefined}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div ref={billingNpiRef}>
                            <Input
                                label="NPI (Type 1) *"
                                value={claim.billing_provider?.npi || ""}
                                onChange={(e) => handleUpdateNested("billing_provider", "npi", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && (!claim.billing_provider?.npi || !/^\d{10}$/.test(claim.billing_provider.npi)) ? (!claim.billing_provider?.npi ? "Required" : "Must be exactly 10 digits") : undefined}
                            />
                        </div>
                        <Input
                            label="Organization NPI (Type 2, optional)"
                            value={claim.billing_provider?.organization_npi || claim.billing_provider?.clinic_npi || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "organization_npi", e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div ref={billingTaxIdRef}>
                            <Input
                                label="Tax ID *"
                                value={claim.billing_provider?.tax_id || ""}
                                onChange={(e) => handleUpdateNested("billing_provider", "tax_id", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 ? (!claim.billing_provider?.tax_id ? "Required" : !isValidTaxIdFormat(claim.billing_provider.tax_id) ? "Must be in format XX-XXXXXXX" : undefined) : undefined}
                            />
                        </div>
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
                    <div ref={billingStreetRef}>
                        <Input
                            label="Address Street *"
                            value={claim.billing_provider?.street || claim.billing_provider?.address?.street || ""}
                            onChange={(e) => handleUpdateNested("billing_provider", "street", e.target.value)}
                            error={submitAttempt && submitAttempt > 0 && !claim.billing_provider?.street && !claim.billing_provider?.address?.street ? "Required" : undefined}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div ref={billingCityRef}>
                            <Input
                                label="City *"
                                value={claim.billing_provider?.city || claim.billing_provider?.address?.city || ""}
                                onChange={(e) => handleUpdateNested("billing_provider", "city", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && !claim.billing_provider?.city && !claim.billing_provider?.address?.city ? "Required" : undefined}
                            />
                        </div>
                        <div ref={billingStateRef}>
                            <Input
                                label="State *"
                                value={claim.billing_provider?.state || claim.billing_provider?.address?.state || ""}
                                onChange={(e) => handleUpdateNested("billing_provider", "state", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && !claim.billing_provider?.state && !claim.billing_provider?.address?.state ? "Required" : undefined}
                            />
                        </div>
                        <div ref={billingZipRef}>
                            <Input
                                label="ZIP *"
                                value={claim.billing_provider?.zip || claim.billing_provider?.address?.zip || ""}
                                onChange={(e) => handleUpdateNested("billing_provider", "zip", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && !claim.billing_provider?.zip && !claim.billing_provider?.address?.zip ? "Required" : undefined}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Service Facility</h3>
                    <p className="text-sm text-slate-600">Where the service occurred.</p>
                </div>
                <div className="space-y-3">
                    <div ref={serviceFacilityNameRef}>
                        <Input
                            label="Facility Name *"
                            value={claim.service_facility?.name || ""}
                            onChange={(e) => handleUpdateNested("service_facility", "name", e.target.value)}
                            error={submitAttempt && submitAttempt > 0 ? (!claim.service_facility?.name ? "Required" : !nameHasLetters(claim.service_facility.name) ? "Must contain letters (e.g. \"City Clinic\")" : undefined) : undefined}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div ref={serviceFacilityNpiRef}>
                            <Input
                                label="Facility NPI *"
                                value={claim.service_facility?.npi || ""}
                                onChange={(e) => handleUpdateNested("service_facility", "npi", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && (!claim.service_facility?.npi || !/^\d{10}$/.test(claim.service_facility.npi)) ? (!claim.service_facility?.npi ? "Required" : "Must be exactly 10 digits") : undefined}
                            />
                        </div>
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
                    <div ref={serviceStreetRef}>
                        <Input
                            label="Address Street *"
                            value={claim.service_facility?.street || claim.service_facility?.address?.street || ""}
                            onChange={(e) => handleUpdateNested("service_facility", "street", e.target.value)}
                            error={submitAttempt && submitAttempt > 0 && !claim.service_facility?.street && !claim.service_facility?.address?.street ? "Required" : undefined}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div ref={serviceCityRef}>
                            <Input
                                label="City *"
                                value={claim.service_facility?.city || claim.service_facility?.address?.city || ""}
                                onChange={(e) => handleUpdateNested("service_facility", "city", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && !claim.service_facility?.city && !claim.service_facility?.address?.city ? "Required" : undefined}
                            />
                        </div>
                        <div ref={serviceStateRef}>
                            <Input
                                label="State *"
                                value={claim.service_facility?.state || claim.service_facility?.address?.state || ""}
                                onChange={(e) => handleUpdateNested("service_facility", "state", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && !claim.service_facility?.state && !claim.service_facility?.address?.state ? "Required" : undefined}
                            />
                        </div>
                        <div ref={serviceZipRef}>
                            <Input
                                label="ZIP *"
                                value={claim.service_facility?.zip || claim.service_facility?.address?.zip || ""}
                                onChange={(e) => handleUpdateNested("service_facility", "zip", e.target.value)}
                                error={submitAttempt && submitAttempt > 0 && !claim.service_facility?.zip && !claim.service_facility?.address?.zip ? "Required" : undefined}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Rendering Provider</h3>
                    <p className="text-sm text-slate-600">Who performed the service (required).</p>
                </div>
                <div className="space-y-3">
                    <div ref={renderingNameRef}>
                        <Input
                            label="Rendering Provider Name *"
                            value={claim.rendering_provider?.name || ""}
                            onChange={(e) => handleUpdateNested("rendering_provider", "name", e.target.value)}
                            error={submitAttempt && submitAttempt > 0 ? (!claim.rendering_provider?.name ? "Required" : !nameHasLetters(claim.rendering_provider.name) ? "Must contain letters (e.g. \"Dr. Smith\")" : undefined) : undefined}
                        />
                    </div>
                    <div ref={renderingNpiRef}>
                        <Input
                            label="Rendering Provider NPI *"
                            value={claim.rendering_provider?.npi || ""}
                            onChange={(e) => handleUpdateNested("rendering_provider", "npi", e.target.value)}
                            error={submitAttempt && submitAttempt > 0 && !claim.rendering_provider?.npi ? "Required" : undefined}
                        />
                    </div>
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
                            {claim.line_items?.map((item: ClaimLineItem, index: number) => (
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
