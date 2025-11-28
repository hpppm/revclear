"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/components/ui/Button";
import Input from "@/app/components/ui/Input";
import Card from "@/app/components/ui/Card";
import { apiClient } from "@/app/lib/api/apiClient";

import BackButton from "@/app/components/ui/BackButton";

export default function AddPatientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setSaving(true);
    setError(null);
    try {
      await apiClient.patients.create(formData);
      router.push("/dashboard"); // Navigate to dashboard after saving
    } catch (error) {
      console.error("Failed to create patient", error);
      const message = (error as any)?.response?.data?.message || (error as any)?.response?.data?.error || "Failed to create patient";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton href="/dashboard">
            Back to Dashboard
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
                  />
                </div>
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
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
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@example.com"
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
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    value={formData.address_city}
                    onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                    placeholder="Erie"
                  />
                  <Input
                    label="State"
                    value={formData.address_state}
                    onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                    placeholder="PA"
                  />
                  <Input
                    label="ZIP Code"
                    value={formData.address_zip}
                    onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                    placeholder="16501"
                  />
                </div>
              </div>
            </div>

            {/* Insurance Information */}
            <div className="border-t border-slate-200 pt-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Insurance Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Insurance Provider"
                  value={formData.insurance_provider}
                  onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                  placeholder="Blue Cross Blue Shield"
                />
                <Input
                  label="Policy Number"
                  value={formData.insurance_policy_number}
                  onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                  placeholder="ABC123456789"
                />
                <Input
                  label="Member ID"
                  value={formData.insurance_member_id}
                  onChange={(e) => setFormData({ ...formData, insurance_member_id: e.target.value })}
                  placeholder="Member/Subscriber ID"
                  helperText="Insurance member or subscriber ID"
                />
                <Input
                  label="Group Number"
                  value={formData.insurance_group_number}
                  onChange={(e) => setFormData({ ...formData, insurance_group_number: e.target.value })}
                  placeholder="Group number"
                />
                <Input
                  label="Payer ID"
                  value={formData.insurance_payer_id}
                  onChange={(e) => setFormData({ ...formData, insurance_payer_id: e.target.value })}
                  placeholder="Clearinghouse payer ID"
                  helperText="For electronic claim submission"
                />
              </div>
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
