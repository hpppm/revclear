"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import { apiClient } from "@/app/lib/api/apiClient";
import logger from "@/app/lib/logger";
import { CreatePatientFormSchema } from "@/app/lib/validation/schemas";

import BackButton from "@/app/components/ui/BackButton";

export default function AddPatientPage() {
  const router = useRouter();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Collect all validation errors at once so every red field shows simultaneously
    const allErrors: Record<string, string> = {};

    // Required field checks
    if (!formData.full_name.trim()) allErrors.full_name = "Full name is required";
    if (!formData.dob) allErrors.dob = "Date of birth is required";
    if (!formData.phone.trim()) allErrors.phone = "Phone number is required";
    if (!isSelfPay) {
      if (!formData.insurance_provider.trim()) allErrors.insurance_provider = "Insurance provider is required";
      if (!formData.insurance_policy_number.trim()) allErrors.insurance_policy_number = "Policy number is required";
      if (!formData.insurance_member_id.trim()) allErrors.insurance_member_id = "Member ID is required";
    }

    // Zod format validation — runs alongside required checks so format errors also show
    const validation = CreatePatientFormSchema.safeParse(formData);
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        const key = String(err.path[0]);
        // Don't overwrite a "required" message with a format message for the same field
        if (key && !allErrors[key]) allErrors[key] = err.message;
      });
    }

    if (Object.keys(allErrors).length > 0) {
      setFieldErrors(allErrors);
      return;
    }

    setSaving(true);

    try {
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

      // Strip empty strings so optional backend fields receive undefined not ""
      const dataToSubmit = Object.fromEntries(
        Object.entries(base).filter(([, v]) => v !== "")
      );

      await apiClient.patients.create(dataToSubmit);
      router.push("/dashboard/patients");
    } catch (error) {
      logger.error("Failed to create patient", error);
      const backendErrors: any[] = error?.response?.data?.errors || [];
      if (backendErrors.length > 0) {
        const errs: Record<string, string> = {};
        backendErrors.forEach((e: any) => {
          const key = String(e.path?.[0] || "");
          if (key && !errs[key]) errs[key] = e.message;
        });
        setFieldErrors(errs);
      } else {
        setError(error?.response?.data?.error || "Failed to create patient");
      }
    } finally {
      setSaving(false);
    }
  };

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
                    label="Full Name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                    error={fieldErrors.full_name}
                  />
                </div>
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  error={fieldErrors.dob}
                />
                <Input
                  label="Gender"
                  variant="select"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                    { value: "U", label: "Unknown" },
                    { value: "O", label: "Other" },
                  ]}
                  error={fieldErrors.gender}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  error={fieldErrors.phone}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  label="Street Address"
                  value={formData.address_street}
                  onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                  placeholder="123 Main St"
                  error={fieldErrors.address_street}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    value={formData.address_city}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    placeholder="Erie"
                    error={fieldErrors.address_city}
                  />
                  <Input
                    label="State"
                    value={formData.address_state}
                    onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                    placeholder="PA"
                    error={fieldErrors.address_state}
                  />
                  <Input
                    label="ZIP Code"
                    value={formData.address_zip}
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    placeholder="16501"
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
                    onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                    placeholder="Blue Cross Blue Shield"
                    error={fieldErrors.insurance_provider}
                  />
                  <Input
                    label="Policy Number *"
                    value={formData.insurance_policy_number}
                    onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                    placeholder="ABC123456789"
                    error={fieldErrors.insurance_policy_number}
                  />
                  <Input
                    label="Member ID *"
                    value={formData.insurance_member_id}
                    onChange={(e) => setFormData({ ...formData, insurance_member_id: e.target.value })}
                    placeholder="Member/Subscriber ID"
                    helperText="Insurance member or subscriber ID"
                    error={fieldErrors.insurance_member_id}
                  />
                  <Input
                    label="Group Number"
                    value={formData.insurance_group_number}
                    onChange={(e) => setFormData({ ...formData, insurance_group_number: e.target.value })}
                    placeholder="Group number"
                    error={fieldErrors.insurance_group_number}
                  />
                  <Input
                    label="Payer ID"
                    value={formData.insurance_payer_id}
                    onChange={(e) => setFormData({ ...formData, insurance_payer_id: e.target.value })}
                    placeholder="Clearinghouse payer ID"
                    helperText="For electronic claim submission"
                    error={fieldErrors.insurance_payer_id}
                  />
                  <Input
                    label="Payer Name"
                    value={formData.insurance_payer_name}
                    onChange={(e) => setFormData({ ...formData, insurance_payer_name: e.target.value })}
                    placeholder="Insurance payer name"
                    error={fieldErrors.insurance_payer_name}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <Button type="submit" loading={saving}>
                Save Patient
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </Card>
        </form>
      </div>
    </div>
  );
}
