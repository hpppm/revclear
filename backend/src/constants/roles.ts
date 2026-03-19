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
