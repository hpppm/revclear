import type { AppRole } from "../auth/roles";

export interface User {
  id: string;
  email: string;
  name: string;
  practitionerType?: string;
  licenseId?: string;
  created_at?: string;
  full_name?: string;
  role?: AppRole;
  phone?: string;
  cognito_id?: string;
  // Provider billing fields
  // SECURITY: npi and tax_id removed from client-side User type — they are
  // provider billing identifiers that should not be stored in React state.
  // Access them via the Organization object (user.organization.npi/tax_id).
  license_state?: string;
  clinic_name?: string;
  clinic_address_street?: string;
  clinic_address_city?: string;
  clinic_address_state?: string;
  clinic_address_zip?: string;
  clinic_phone?: string;
  taxonomy_code?: string;
  clinic_npi?: string;
  provider_role?: "rendering" | "billing" | "both";
  organization_id?: string | null;
  organization?: Organization;
  memberships?: OrganizationMembership[];
}

export interface Organization {
  id: string;
  name: string;
  npi?: string;
  tax_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
  billing_name?: string;
  billing_npi?: string;
  billing_tax_id?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_phone?: string;
  default_place_of_service?: string;
  edi_sender_id?: string;
  edi_receiver_id?: string;
  edi_sftp_host?: string;
  edi_sftp_username?: string;
  // SECURITY: edi_sftp_password and edi_sftp_private_key are never sent to frontend
  // These credentials are managed securely on the server only
  edi_sftp_port?: number;
  fee_schedule?: Record<string, any>;
  payer_enrollments?: Record<string, any>;
  billing_defaults?: Record<string, any>;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  is_admin: boolean;
  created_at?: string;
  organization?: Organization;
}

export interface OrganizationMember {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at?: string;
}

export interface OrganizationInviteActor {
  id: string;
  email: string;
  full_name: string;
}

export interface OrganizationInvite {
  id: string;
  role: "clinician" | "nurse" | "billing_staff" | "receptionist";
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  created_by: OrganizationInviteActor;
  used_by?: OrganizationInviteActor | null;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  diagnosis?: string;
  dob?: string;
  gender?: string;
  email?: string;
  phone?: string;
  insuranceType?: string;
  insuranceId?: string;
  insurance_group_number?: string;
  insurance_payer_id?: string;
  insurance_payer_name?: string;
  insurance_relationship?: "self" | "spouse" | "child" | "other";
  plan_name?: string;
  lastVisit?: string;
  status?: "Active" | "Archived";
  // Address fields
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  // Insurance fields
  insurance_member_id?: string;
  insurance_policy_number?: string;
}

export interface MedicalCode {
  id: string;
  type: "CPT" | "ICD-10";
  code: string;
  description: string;
  category?: string;
  confidence?: number;
  source?: string;
}

export interface SoapNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface Encounter {
  id: string;
  patient_id: string;
  date_of_service: string;
  status:
    | "scheduled"
    | "in_progress"
    | "ready_for_review"
    | "ready"
    | "completed"
    | "archived";
  audio_key?: string;
  transcript_result_id?: string;
  soap_result_id?: string;
  created_at?: string;
  updated_at?: string;
  patient_name?: string; // Joined from patients table
  // Billing fields
  place_of_service?: string;
}

export interface Claim {
  id: string;
  encounter_id: string;
  clinician_id?: string;
  patient_id?: string;
  diagnosis_codes?: string[];
  procedure_codes?: string[];
  total_amount?: number;
  insurance_provider?: string;
  status?: string;
  rejection_reason?: string;
  submission_date?: string;
  payment_date?: string;
  // New claim fields
  payer_id?: string;
  payer_name?: string;
  claim_type?: "professional" | "institutional";
  submission_type?: "initial" | "corrected" | "void";
  patient_responsibility?: number;
  line_items?: ClaimLineItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ClaimLineItem {
  line_number: number;
  procedure_code: string;
  modifiers?: string[];
  diagnosis_pointers?: number[];
  units: number;
  charge_amount: number;
  place_of_service?: string;
  date_of_service?: string;
}
