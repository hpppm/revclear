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

export const ORGANIZATION_MANAGER_ROLES: AppRole[] = ["admin", "clinician"];

export function isOrganizationManager(role: string | undefined): boolean {
  return role === "admin" || role === "clinician";
}

export function canReadPatients(role: string | undefined): boolean {
  return role === "admin" || role === "clinician" || role === "nurse" || role === "receptionist";
}

export function canWritePatients(role: string | undefined): boolean {
  return role === "admin" || role === "clinician" || role === "receptionist";
}

export function canManageEncounters(role: string | undefined): boolean {
  return role === "admin" || role === "clinician" || role === "nurse";
}

export function canUseClinicalAI(role: string | undefined): boolean {
  return canManageEncounters(role);
}

export function canManageClaims(role: string | undefined): boolean {
  return role === "admin" || role === "clinician" || role === "billing_staff" || role === "receptionist";
}
