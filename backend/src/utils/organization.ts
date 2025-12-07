import { query } from "../config/db";

/**
 * Get the organization for a user
 * Since users can only belong to one organization, this is a simple lookup
 */
export const getUserOrganization = async (userId: string) => {
  const result = await query(
    `SELECT o.*
     FROM organizations o
     JOIN users u ON u.organization_id = o.id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
};

/**
 * Check if a user is an admin of their organization
 */
export const isOrganizationAdmin = async (userId: string): Promise<boolean> => {
  const result = await query(
    "SELECT is_org_admin FROM users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.is_org_admin || false;
};

/**
 * Assign a user to an organization
 * Replaces any previous organization membership
 */
export const assignUserToOrganization = async (
  userId: string,
  organizationId: string,
  isAdmin = false
) => {
  const result = await query(
    `UPDATE users 
     SET organization_id = $1, is_org_admin = $2
     WHERE id = $3
     RETURNING id, organization_id, is_org_admin`,
    [organizationId, isAdmin, userId]
  );
  return result.rows[0];
};

/**
 * Remove a user from their organization
 */
export const removeUserFromOrganization = async (userId: string) => {
  const result = await query(
    `UPDATE users 
     SET organization_id = NULL, is_org_admin = false
     WHERE id = $1
     RETURNING id`,
    [userId]
  );
  return result.rows[0];
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
    [organizationId]
  );
  return result.rows;
};
