export const APP_ROLES = [
  "admin",
  "clinician",
  "nurse",
  "billing_staff",
  "receptionist",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ORGANIZATION_MEMBER_ROLES = [
  "clinician",
  "nurse",
  "billing_staff",
  "receptionist",
] as const;

export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];

// Legacy "admin" remains valid during transition, but clinician is the
// canonical organization manager role in product behavior.
export const ORGANIZATION_MANAGER_ROLES: AppRole[] = ["admin", "clinician"];

export const PATIENT_READ_ROLES: AppRole[] = [
  "admin",
  "clinician",
  "nurse",
  "receptionist",
];

export const PATIENT_WRITE_ROLES: AppRole[] = [
  "admin",
  "clinician",
  "receptionist",
];

export const ENCOUNTER_ROLES: AppRole[] = [
  "admin",
  "clinician",
  "nurse",
];

export const CLINICAL_AI_ROLES: AppRole[] = [
  "admin",
  "clinician",
  "nurse",
];

export const CLAIM_ROLES: AppRole[] = [
  "admin",
  "clinician",
  "billing_staff",
  "receptionist",
];

export const RBAC_CAPABILITIES = [
  "manage_organization",
  "read_patients",
  "write_patients",
  "manage_encounters",
  "use_clinical_ai",
  "manage_claims",
] as const;

export type RbacCapability = (typeof RBAC_CAPABILITIES)[number];

export const CAPABILITY_TO_ROLES: Record<RbacCapability, AppRole[]> = {
  manage_organization: ORGANIZATION_MANAGER_ROLES,
  read_patients: PATIENT_READ_ROLES,
  write_patients: PATIENT_WRITE_ROLES,
  manage_encounters: ENCOUNTER_ROLES,
  use_clinical_ai: CLINICAL_AI_ROLES,
  manage_claims: CLAIM_ROLES,
};
