"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import UnauthorizedState from "@/app/components/ui/UnauthorizedState";
import { useAuthorization } from "@/app/context/AuthContext";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import { CreatePatientFormSchema } from "@/app/lib/validation/schemas";

import BackButton from "@/app/components/ui/BackButton";

const US_STATES = [
  { value: "", label: "Select state" },
  { value: "AL", label: "AL — Alabama" }, { value: "AK", label: "AK — Alaska" },
  { value: "AZ", label: "AZ — Arizona" }, { value: "AR", label: "AR — Arkansas" },
  { value: "CA", label: "CA — California" }, { value: "CO", label: "CO — Colorado" },
  { value: "CT", label: "CT — Connecticut" }, { value: "DE", label: "DE — Delaware" },
  { value: "FL", label: "FL — Florida" }, { value: "GA", label: "GA — Georgia" },
  { value: "HI", label: "HI — Hawaii" }, { value: "ID", label: "ID — Idaho" },
  { value: "IL", label: "IL — Illinois" }, { value: "IN", label: "IN — Indiana" },
  { value: "IA", label: "IA — Iowa" }, { value: "KS", label: "KS — Kansas" },
  { value: "KY", label: "KY — Kentucky" }, { value: "LA", label: "LA — Louisiana" },
  { value: "ME", label: "ME — Maine" }, { value: "MD", label: "MD — Maryland" },
  { value: "MA", label: "MA — Massachusetts" }, { value: "MI", label: "MI — Michigan" },
  { value: "MN", label: "MN — Minnesota" }, { value: "MS", label: "MS — Mississippi" },
  { value: "MO", label: "MO — Missouri" }, { value: "MT", label: "MT — Montana" },
  { value: "NE", label: "NE — Nebraska" }, { value: "NV", label: "NV — Nevada" },
  { value: "NH", label: "NH — New Hampshire" }, { value: "NJ", label: "NJ — New Jersey" },
  { value: "NM", label: "NM — New Mexico" }, { value: "NY", label: "NY — New York" },
  { value: "NC", label: "NC — North Carolina" }, { value: "ND", label: "ND — North Dakota" },
  { value: "OH", label: "OH — Ohio" }, { value: "OK", label: "OK — Oklahoma" },
  { value: "OR", label: "OR — Oregon" }, { value: "PA", label: "PA — Pennsylvania" },
  { value: "RI", label: "RI — Rhode Island" }, { value: "SC", label: "SC — South Carolina" },
  { value: "SD", label: "SD — South Dakota" }, { value: "TN", label: "TN — Tennessee" },
  { value: "TX", label: "TX — Texas" }, { value: "UT", label: "UT — Utah" },
  { value: "VT", label: "VT — Vermont" }, { value: "VA", label: "VA — Virginia" },
  { value: "WA", label: "WA — Washington" }, { value: "WV", label: "WV — West Virginia" },
  { value: "WI", label: "WI — Wisconsin" }, { value: "WY", label: "WY — Wyoming" },
  { value: "DC", label: "DC — Washington D.C." },
];

export default function AddPatientPage() {
  const router = useRouter();
  const { canWritePatients } = useAuthorization();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSelfPay, setIsSelfPay] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    dob: "",
    gender: "M",
    phone: "",
    email: "",
    // Address
    address_street: "",
    address_city: "",
    address_state: "",
    address_zip: "",
    // Insurance
    insurance_provider: "",
    insurance_policy_number: "",
    insurance_member_id: "",
    insurance_group_number: "",
    insurance_payer_id: "",
    insurance_payer_name: "",
  });

  const validateField = (field: string, value: string): string | null => {
    const fieldSchema = CreatePatientFormSchema.shape[field as keyof typeof CreatePatientFormSchema.shape];
    if (!fieldSchema) return null;
    const result = fieldSchema.safeParse(value);
    return result.success ? null : (result.error.issues[0]?.message || "Invalid value");
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // If there's already an error on this field, re-validate live so it clears the moment it's correct
    if (fieldErrors[field]) {
      const err = validateField(field, value);
      setFieldErrors((prev) => {
        if (err) return { ...prev, [field]: err };
        const rest = { ...prev };
        delete rest[field];
        return rest;
      });
    }
  };

  const handleBlur = (field: string, value: string, el?: HTMLElement) => {
    if (!value.trim()) return; // Don't show errors on empty untouched fields — submit handles that
    const err = validateField(field, value);
    setFieldErrors((prev) => {
      if (err) return { ...prev, [field]: err };
      const rest = { ...prev };
      delete rest[field];
      return rest;
    });
    if (err && el) {
      setTimeout(() => {
        const target = el.closest("label") ?? el;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Apply self-pay override before validation so the schema sees "SELF_PAY"
    // as the insurance_provider (satisfying the required check) and skips the
    // conditional policy/member fields.
    const base = isSelfPay
      ? {
        ...formData,
        insurance_provider: "SELF_PAY",
        insurance_policy_number: "",
        insurance_member_id: "",
        insurance_group_number: "",
        insurance_payer_id: "",
        insurance_payer_name: "",
      }
      : formData;

    // Collect all validation errors at once so every red field shows simultaneously
    const allErrors: Record<string, string> = {};

    // Required field checks (fast path before Zod for clearer messages)
    if (!base.full_name.trim()) allErrors.full_name = "Full name is required";
    if (!base.dob) allErrors.dob = "Date of birth is required";
    if (!base.phone.trim()) allErrors.phone = "Phone number is required";
    if (!isSelfPay) {
      if (!base.insurance_provider.trim()) allErrors.insurance_provider = "Insurance provider is required";
      if (!base.insurance_policy_number.trim()) allErrors.insurance_policy_number = "Policy number is required";
      if (!base.insurance_member_id.trim()) allErrors.insurance_member_id = "Member ID is required";
    }

    // Zod format validation — runs against base (with self-pay override applied)
    // so self-pay patients are never blocked by insurance field validation.
    const validation = CreatePatientFormSchema.safeParse(base);
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        const key = String(err.path[0]);
        // Don't overwrite a "required" message with a format message for the same field
        if (key && !allErrors[key]) allErrors[key] = err.message;
      });
    }

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      // Scroll to the first error field
      setTimeout(() => {
        const first = document.querySelector("[data-field-error]") as HTMLElement | null;
        if (first) {
          const target = first.closest("label") ?? first;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    setSaving(true);

    try {
      // Strip empty strings so optional backend fields receive undefined not ""
      const dataToSubmit = Object.fromEntries(
        Object.entries(base).filter(([, v]) => v !== "")
      );

      await apiClient.patients.create(dataToSubmit);
      router.push("/dashboard/patients");
    } catch (error) {
      logger.error("Failed to create patient", error);
      const backendErrors: any[] = (error as any)?.response?.data?.errors || [];
      if (backendErrors.length > 0) {
        const errs: Record<string, string> = {};
        backendErrors.forEach((e: any) => {
          const key = String(e.path?.[0] || "");
          if (key && !errs[key]) errs[key] = e.message;
        });
        setFieldErrors(errs);
      } else {
        setError((error as any)?.response?.data?.error || "Failed to create patient");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!canWritePatients) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <UnauthorizedState message="Your role does not have access to add new patients." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton href="/dashboard/patients">
            Back to Patients
          </BackButton>
          <h1 className="text-3xl font-bold text-slate-900">Add New Patient</h1>
          <p className="text-slate-600 mt-2">
            Enter patient information and insurance details
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Full Name *"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    onBlur={(e) => handleBlur("full_name", e.target.value, e.target as HTMLElement)}
                    placeholder="John Doe"
                    required
                    error={fieldErrors.full_name}
                  />
                </div>
                <Input
                  label="Date of Birth *"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  onBlur={(e) => handleBlur("dob", e.target.value, e.target as HTMLElement)}
                  min="1900-01-01"
                  max={new Date().toISOString().split("T")[0]}
                  required
                  error={fieldErrors.dob}
                />
                <Input
                  label="Gender *"
                  variant="select"
                  value={formData.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  required
                  options={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                    { value: "U", label: "Unknown" },
                    { value: "O", label: "Other" },
                  ]}
                  error={fieldErrors.gender}
                />
                <Input
                  label="Phone *"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  onBlur={(e) => handleBlur("phone", e.target.value, e.target as HTMLElement)}
                  placeholder="(555) 123-4567"
                  required
                  error={fieldErrors.phone}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={(e) => handleBlur("email", e.target.value, e.target as HTMLElement)}
                  placeholder="john.doe@example.com"
                  error={fieldErrors.email}
                />
              </div>
            </div>

            {/* Address */}
            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Address</h2>
              <div className="space-y-4">
                <Input
                  label="Street Address *"
                  value={formData.address_street}
                  onChange={(e) => handleChange("address_street", e.target.value)}
                  onBlur={(e) => handleBlur("address_street", e.target.value, e.target as HTMLElement)}
                  placeholder="123 Main St"
                  required
                  error={fieldErrors.address_street}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City *"
                    value={formData.address_city}
                    onChange={(e) => handleChange("address_city", e.target.value)}
                    onBlur={(e) => handleBlur("address_city", e.target.value, e.target as HTMLElement)}
                    placeholder="Erie"
                    required
                    error={fieldErrors.address_city}
                  />
                  <Input
                    label="State *"
                    variant="select"
                    value={formData.address_state}
                    onChange={(e) => { handleChange("address_state", e.target.value); handleBlur("address_state", e.target.value); }}
                    options={US_STATES}
                    required
                    error={fieldErrors.address_state}
                  />
                  <Input
                    label="ZIP Code"
                    value={formData.address_zip}
                    onChange={(e) => handleChange("address_zip", e.target.value)}
                    onBlur={(e) => handleBlur("address_zip", e.target.value, e.target as HTMLElement)}
                    placeholder="16501"
                    required
                    error={fieldErrors.address_zip}
                  />
                </div>
              </div>
            </div>

            {/* Insurance Information */}
            <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Insurance Information</h2>

                {/* Self-Pay Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSelfPay}
                      onChange={(e) => setIsSelfPay(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                    Self-Pay / No Insurance
                  </span>
                </label>
              </div>

              {isSelfPay ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Self-Pay Patient</h3>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        This patient will be marked as self-pay. No insurance claims will be generated for their encounters.
                        All charges will be billed directly to the patient.
                      </p>
                      <div className="mt-3 text-xs text-blue-700 space-y-1">
                        <p>• Encounters will be tracked normally</p>
                        <p>• SOAP notes will be generated as usual</p>
                        <p>• No insurance claims will be created</p>
                        <p>• Patient statements can be generated for billing</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Insurance Provider *"
                    value={formData.insurance_provider}
                    onChange={(e) => handleChange("insurance_provider", e.target.value)}
                    onBlur={(e) => handleBlur("insurance_provider", e.target.value, e.target as HTMLElement)}
                    placeholder="Blue Cross Blue Shield"
                    required
                    error={fieldErrors.insurance_provider}
                  />
                  <Input
                    label="Policy Number *"
                    value={formData.insurance_policy_number}
                    onChange={(e) => handleChange("insurance_policy_number", e.target.value)}
                    onBlur={(e) => handleBlur("insurance_policy_number", e.target.value, e.target as HTMLElement)}
                    placeholder="ABC123456789"
                    helperText="6–15 characters"
                    required
                    error={fieldErrors.insurance_policy_number}
                  />
                  <Input
                    label="Member ID *"
                    value={formData.insurance_member_id}
                    onChange={(e) => handleChange("insurance_member_id", e.target.value)}
                    onBlur={(e) => handleBlur("insurance_member_id", e.target.value, e.target as HTMLElement)}
                    placeholder="Member/Subscriber ID"
                    helperText="8–11 characters"
                    required
                    error={fieldErrors.insurance_member_id}
                  />
                  <Input
                    label="Group Number"
                    value={formData.insurance_group_number}
                    onChange={(e) => handleChange("insurance_group_number", e.target.value)}
                    placeholder="Group number"
                    error={fieldErrors.insurance_group_number}
                  />
                  <Input
                    label="Payer ID"
                    value={formData.insurance_payer_id}
                    onChange={(e) => handleChange("insurance_payer_id", e.target.value)}
                    placeholder="Clearinghouse payer ID"
                    helperText="For electronic claim submission"
                    error={fieldErrors.insurance_payer_id}
                  />
                  <Input
                    label="Payer Name"
                    value={formData.insurance_payer_name}
                    onChange={(e) => handleChange("insurance_payer_name", e.target.value)}
                    placeholder="Insurance payer name"
                    error={fieldErrors.insurance_payer_name}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/dashboard/patients")}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save Patient
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </Card>
        </form>
      </div>
    </div>
  );
}
