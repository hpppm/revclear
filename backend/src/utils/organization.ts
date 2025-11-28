import { query } from "../config/db";

export const getUserOrganization = async (userId: string) => {
  const result = await query(
    `SELECT o.*
     FROM organization_memberships om
     JOIN organizations o ON om.organization_id = o.id
     WHERE om.user_id = $1
     ORDER BY om.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const ensureMembership = async (organizationId: string, userId: string, isAdmin = false) => {
  const existing = await query(
    "SELECT id FROM organization_memberships WHERE organization_id = $1 AND user_id = $2",
    [organizationId, userId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await query(
    `INSERT INTO organization_memberships (organization_id, user_id, is_admin)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [organizationId, userId, isAdmin]
  );
  return inserted.rows[0];
};
