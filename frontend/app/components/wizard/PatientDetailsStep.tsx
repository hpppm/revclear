"use client";

import { useMemo, useState } from "react";
import Input from "../ui/Input";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { Patient } from "@/app/lib/types";
import { SubscriberFormSchema } from "@/app/lib/validation/schemas";

interface PatientDetailsStepProps {
  metadata: {
    date: string;
    patientId: string;
    provider: string;
    encounterType?: string;
    chiefComplaint?: string;
    relationship?: "self" | "spouse" | "child" | "other";
    subscriber?: any;
  };
  setMetadata: (metadata: any) => void;
  patients: Patient[];
  loadingPatients: boolean;
  patientsError: string | null;
  loadSubscriber: (patientId: string) => Promise<void>;
  subscriberLoading: boolean;
  subscriberError?: string | null;
  subscriberSaving?: boolean;
  encounterFieldErrors?: Record<string, string>;
  canEditPatientData?: boolean;
}

export default function PatientDetailsStep({
  metadata,
  setMetadata,
  patients,
  loadingPatients,
  patientsError,
  loadSubscriber,
  subscriberLoading,
  subscriberError,
  subscriberSaving,
  encounterFieldErrors,
  canEditPatientData = false,
}: PatientDetailsStepProps) {
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === metadata.patientId),
    [patients, metadata.patientId]
  );

  const [subscriberFieldErrors, setSubscriberFieldErrors] = useState<Record<string, string>>({});

  const handleSubscriberChange = (field: string, value: any) => {
    const updated = { ...(metadata.subscriber || {}), [field]: value };
    setMetadata({ ...metadata, subscriber: updated });

    const fieldSchema = (SubscriberFormSchema as any).shape?.[field];
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value);
      setSubscriberFieldErrors((prev: Record<string, string>) => {
        if (result.success) {
          const { [field]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [field]: result.error.issues[0]?.message || "Invalid value" };
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          Patient and Encounter Details
        </h2>
        <p className="text-slate-600">
          Select a patient, encounter details, and subscriber info for billing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Encounter Date"
          type="date"
          value={metadata.date}
          onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
          error={encounterFieldErrors?.date}
        />

        <label className="space-y-1 block">
          <span className="text-sm font-medium text-slate-700">Encounter Type</span>
          <select
            id="encounter-type"
            name="encounter-type"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={metadata.encounterType || "office_visit"}
            onChange={(e) => setMetadata({ ...metadata, encounterType: e.target.value })}
          >
            <option value="office_visit">Office Visit</option>
            <option value="telehealth">Telehealth</option>
            <option value="phone">Phone</option>
            <option value="home_visit">Home Visit</option>
          </select>
          {encounterFieldErrors?.encounterType && <p className="mt-1 text-sm text-red-500">{encounterFieldErrors.encounterType}</p>}
        </label>
      </div>

      <Input
        label="Chief Complaint"
        value={metadata.chiefComplaint || ""}
        onChange={(e) => setMetadata({ ...metadata, chiefComplaint: e.target.value })}
        placeholder="e.g., Headache and nausea"
      />

      <label className="space-y-1 block">
        <span className="text-sm font-medium text-slate-700">Patient</span>
        <select
          id="patient-select"
          name="patient-select"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={metadata.patientId}
        onChange={(e) => {
          const val = e.target.value;
          const picked = patients.find((p) => p.id === val);
          const rel = picked?.insurance_relationship || "self";
          setMetadata({ ...metadata, patientId: val, subscriber: null, relationship: rel });
          if (val) loadSubscriber(val);
        }}
      >
          <option value="">Select a patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
              {patient.age ? ` (${patient.age})` : ""}
            </option>
          ))}
        </select>
        {loadingPatients && <p className="text-xs text-slate-500">Loading patients...</p>}
        {patientsError && <p className="text-xs text-amber-700">{patientsError}</p>}
        {encounterFieldErrors?.patientId && <p className="mt-1 text-sm text-red-500">{encounterFieldErrors.patientId}</p>}
      </label>

      {selectedPatient && (
        <Card className="p-4 space-y-3 bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Selected Patient</p>
              <p className="text-sm text-slate-700 mt-1">
                {selectedPatient.name}
                {selectedPatient.dob && ` • DOB: ${new Date(selectedPatient.dob).toLocaleDateString("en-US")}`}
              </p>
              <p className="text-xs text-slate-500">
                {selectedPatient.insuranceType || "Insurance not set"} • {selectedPatient.insuranceId || "Member ID not set"}
              </p>
            </div>
            {selectedPatient.insurance_relationship && (
              <Badge variant="neutral" size="sm">
                Relationship: {selectedPatient.insurance_relationship}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Relationship to Subscriber"
              variant="select"
              value={metadata.relationship || "self"}
              onChange={(e) => setMetadata({ ...metadata, relationship: e.target.value })}
              disabled={!canEditPatientData}
              options={[
                { value: "self", label: "Self" },
                { value: "spouse", label: "Spouse" },
                { value: "child", label: "Child" },
                { value: "other", label: "Other" },
              ]}
            />
            <Input label="Insurance Provider" value={selectedPatient.insuranceType || ""} disabled />
            <Input
              label="Member / Policy ID"
              value={selectedPatient.insurance_member_id || selectedPatient.insuranceId || selectedPatient.insurance_policy_number || ""}
              disabled
            />
            <Input label="Group Number" value={selectedPatient.insurance_group_number || ""} disabled />
            <Input label="Payer ID" value={selectedPatient.insurance_payer_id || ""} disabled />
          </div>

          {metadata.relationship !== "self" && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Subscriber Information</p>
                <div className="flex items-center gap-3">
                  {subscriberLoading && <p className="text-xs text-slate-500">Loading subscriber...</p>}
                  {subscriberSaving && <p className="text-xs text-blue-600">Saving...</p>}
                </div>
                {subscriberError && <p className="text-xs text-amber-600">{subscriberError}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Subscriber Name"
                  value={metadata.subscriber?.full_name || ""}
                  onChange={(e) => handleSubscriberChange("full_name", e.target.value)}
                  error={subscriberFieldErrors.full_name}
                  disabled={!canEditPatientData}
                />
                <Input
                  label="Subscriber DOB"
                  type="date"
                  value={metadata.subscriber?.dob || ""}
                  onChange={(e) => handleSubscriberChange("dob", e.target.value)}
                  error={subscriberFieldErrors.dob}
                  disabled={!canEditPatientData}
                />
                <Input
                  label="Subscriber Gender"
                  variant="select"
                  value={metadata.subscriber?.gender || "M"}
                  onChange={(e) => handleSubscriberChange("gender", e.target.value)}
                  error={subscriberFieldErrors.gender}
                  disabled={!canEditPatientData}
                  options={[
                    { value: "M", label: "Male" },
                    { value: "F", label: "Female" },
                    { value: "U", label: "Unknown" },
                    { value: "O", label: "Other" },
                  ]}
                />
                <Input
                  label="Subscriber Phone"
                  value={metadata.subscriber?.phone || ""}
                  onChange={(e) => handleSubscriberChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  error={subscriberFieldErrors.phone}
                  disabled={!canEditPatientData}
                />
              </div>
              <Input
                label="Subscriber Address"
                value={metadata.subscriber?.address_street || ""}
                onChange={(e) => handleSubscriberChange("address_street", e.target.value)}
                placeholder="123 Main St"
                error={subscriberFieldErrors.address_street}
                disabled={!canEditPatientData}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  label="City"
                  value={metadata.subscriber?.address_city || ""}
                  onChange={(e) => handleSubscriberChange("address_city", e.target.value)}
                  error={subscriberFieldErrors.address_city}
                  disabled={!canEditPatientData}
                />
                <Input
                  label="State"
                  value={metadata.subscriber?.address_state || ""}
                  onChange={(e) => handleSubscriberChange("address_state", e.target.value)}
                  error={subscriberFieldErrors.address_state}
                  disabled={!canEditPatientData}
                />
                <Input
                  label="ZIP"
                  value={metadata.subscriber?.address_zip || ""}
                  onChange={(e) => handleSubscriberChange("address_zip", e.target.value)}
                  error={subscriberFieldErrors.address_zip}
                  disabled={!canEditPatientData}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Subscriber Member ID"
                  value={metadata.subscriber?.member_id || ""}
                  onChange={(e) => handleSubscriberChange("member_id", e.target.value)}
                  error={subscriberFieldErrors.member_id}
                  disabled={!canEditPatientData}
                />
                <Input
                  label="Subscriber Group Number"
                  value={metadata.subscriber?.group_number || ""}
                  onChange={(e) => handleSubscriberChange("group_number", e.target.value)}
                  error={subscriberFieldErrors.group_number}
                  disabled={!canEditPatientData}
                />
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
