import { AppRole, ORGANIZATION_MANAGER_ROLES } from "../constants/roles";
import { query } from "../config/db";

// SECURITY: Explicit column list for organization queries - excludes SFTP credentials
// This prevents sensitive data from ever leaving the database layer
const ORG_SAFE_COLUMNS = `
    o.id, o.name, o.npi, o.tax_id, o.address_line1, o.address_line2, o.city, o.state, o.postal_code, o.phone, o.timezone,
    o.billing_name, o.billing_npi, o.billing_tax_id, o.billing_address_line1, o.billing_address_line2,
    o.billing_city, o.billing_state, o.billing_postal_code, o.billing_phone,
    o.default_place_of_service, o.edi_sender_id, o.edi_receiver_id, o.edi_sftp_host, o.edi_sftp_username, o.edi_sftp_port,
    o.fee_schedule, o.payer_enrollments, o.billing_defaults, o.created_at, o.updated_at
`
  .replace(/\s+/g, " ")
  .trim();

/**
 * Get the organization for a user
 * Since users can only belong to one organization, this is a simple lookup
 * SECURITY: Uses explicit column list to exclude edi_sftp_password and edi_sftp_private_key
 */
export const getUserOrganization = async (userId: string) => {
  const result = await query(
    `SELECT ${ORG_SAFE_COLUMNS}
     FROM organizations o
     JOIN users u ON u.organization_id = o.id
     WHERE u.id = $1`,
    [userId],
  );
  return result.rows[0] || null;
};

export const filterOrganizationForRole = <
  T extends Record<string, any> | null | undefined,
>(
  organization: T,
  role?: AppRole | string,
): T => {
  if (!organization) return organization;

  if (role && ORGANIZATION_MANAGER_ROLES.includes(role as AppRole)) {
    return organization;
  }

  const {
    npi,
    tax_id,
    billing_name,
    billing_npi,
    billing_tax_id,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    billing_phone,
    default_place_of_service,
    edi_sender_id,
    edi_receiver_id,
    edi_sftp_host,
    edi_sftp_username,
    edi_sftp_port,
    fee_schedule,
    payer_enrollments,
    billing_defaults,
    ...summaryOrganization
  } = organization;

  return summaryOrganization as T;
};

export const getEffectiveOrganizationRole = (
  user:
    | {
        role?: AppRole | string | null;
        organization_id?: string | null;
      }
    | null
    | undefined,
): AppRole | undefined => {
  if (!user?.organization_id || !user.role) return undefined;
  return user.role as AppRole;
};

/**
 * Check if a user is an admin of their organization
 */
export const isOrganizationAdmin = async (userId: string): Promise<boolean> => {
  const result = await query("SELECT is_org_admin FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0]?.is_org_admin || false;
};

/**
 * Assign a user to an organization
 * Replaces any previous organization membership
 */
export const assignUserToOrganization = async (
  userId: string,
  organizationId: string,
  isAdmin = false,
) => {
  const result = await query(
    `UPDATE users 
     SET organization_id = $1, role = $2, is_org_admin = $3
     WHERE id = $4
     RETURNING id, organization_id, role, is_org_admin`,
    [organizationId, isAdmin ? "clinician" : null, isAdmin, userId],
  );
  return result.rows[0];
};

/**
 * Remove a user from their organization
 */
export const removeUserFromOrganization = async (userId: string) => {
  const result = await query(
    `UPDATE users 
     SET organization_id = NULL, role = NULL, is_org_admin = false
     WHERE id = $1
     RETURNING id`,
    [userId],
  );
  return result.rows[0];
};

export interface OrgEdiSettings {
  edi_sender_id?: string;
  edi_receiver_id?: string;
  edi_clearinghouse_url?: string;
  edi_clearinghouse_api_key?: string;
  edi_sftp_host?: string;
  edi_sftp_port?: number;
  edi_sftp_username?: string;
  edi_sftp_password?: string;
  edi_sftp_private_key?: string;
}

/**
 * Fetch org EDI/SFTP credentials for server-side clearinghouse submission.
 * SECURITY: includes edi_sftp_password and edi_sftp_private_key — never send to client.
 */
export const getOrgEdiSettings = async (
  organizationId: string,
): Promise<OrgEdiSettings | null> => {
  const result = await query(
    `SELECT edi_sender_id, edi_receiver_id, edi_clearinghouse_url, edi_clearinghouse_api_key,
            edi_sftp_host, edi_sftp_port, edi_sftp_username, edi_sftp_password, edi_sftp_private_key
     FROM organizations WHERE id = $1`,
    [organizationId],
  );
  return result.rows[0] || null;
};

/**
 * Get all users in an organization
 */
export const getOrganizationUsers = async (organizationId: string) => {
  const result = await query(
    `SELECT id, email, full_name, is_org_admin, created_at
     FROM users
     WHERE organization_id = $1
     ORDER BY created_at ASC`,
    [organizationId],
  );
  return result.rows;
};
