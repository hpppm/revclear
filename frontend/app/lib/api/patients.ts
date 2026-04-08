import { z } from "zod";
import api from "./axios";
import { deduplicateGet } from "./deduplicate";

// SECURITY: Explicit schemas strip any injected internal fields
// (organization_id, clinician_id, role) that callers must not control.
// ID params are validated as UUIDs and encoded before URL injection.

const UUID = z.string().uuid("Invalid patient ID format");

// Fields callers are allowed to write — internal server fields are omitted.
const PatientWriteSchema = z.object({
  full_name: z.string().min(1).optional(),
  dob: z.string().optional().nullable().or(z.literal("")),
  gender: z.string().optional().nullable().or(z.literal("")),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  // Insurance fields — insurance_provider and insurance_policy_number are the
  // legacy column names used by the backend and patient profile page.
  insurance_provider: z.string().optional().nullable(),
  insurance_policy_number: z.string().optional().nullable(),
  insurance_member_id: z.string().optional().nullable(),
  insurance_group_number: z.string().optional().nullable(),
  insurance_payer_id: z.string().optional().nullable(),
  insurance_payer_name: z.string().optional().nullable(),
  insurance_relationship: z.enum(["self", "spouse", "child", "other"]).optional(),
  plan_name: z.string().optional().nullable(),
  address_street: z.string().optional().nullable(),
  address_city: z.string().optional().nullable(),
  address_state: z.string().optional().nullable(),
  address_zip: z.string().optional().nullable(),
  status: z.enum(["Active", "Archived"]).optional(),
  // subscriber_id is set when a non-self subscriber is linked to the patient
  subscriber_id: z.string().uuid().optional().nullable(),
});

const SubscriberWriteSchema = z.object({
  full_name: z.string().min(1, "Subscriber name is required").max(100),
  dob: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(1, "Phone number is required"),
  member_id: z.string().min(1, "Member ID is required").max(50),
  gender: z.string().optional(),
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  group_number: z.string().optional(),
  relationship: z.enum(["self", "spouse", "child", "other"]).optional(),
});

export type PatientWritePayload = z.infer<typeof PatientWriteSchema>;
export type SubscriberWritePayload = z.infer<typeof SubscriberWriteSchema>;

const safeId = (id: string) => encodeURIComponent(UUID.parse(id));

export const patientsApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    deduplicateGet("patients.getAll", () => api.get("/patients", { params })),

  getById: (id: string) =>
    deduplicateGet(`patients.getById.${id}`, () => api.get(`/patients/${safeId(id)}`)),

  create: (data: PatientWritePayload) =>
    api.post("/patients", PatientWriteSchema.parse(data)),

  update: (id: string, data: PatientWritePayload) =>
    api.put(`/patients/${safeId(id)}`, PatientWriteSchema.parse(data)),

  delete: (id: string) => api.delete(`/patients/${safeId(id)}`),

  getSubscriber: (id: string) =>
    deduplicateGet(`patients.getSubscriber.${id}`, () => api.get(`/patients/${safeId(id)}/subscriber`)),

  upsertSubscriber: (id: string, data: SubscriberWritePayload) =>
    api.put(`/patients/${safeId(id)}/subscriber`, SubscriberWriteSchema.parse(data)),
};
