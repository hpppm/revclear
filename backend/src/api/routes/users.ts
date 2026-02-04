import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";

const router = Router();

// Helper to check if user is org admin
const isOrgAdmin = (user: any): boolean => {
  return user?.is_org_admin === true || user?.role === 'admin';
};

/**
 * @route GET /api/users
 * @description Get a paginated list of users in the same organization (admin only)
 * @access Private (requires authMiddleware + admin role)
 * @query {number} limit - Max results (default 50, max 100)
 * @query {number} offset - Skip results (default 0)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Admin check - only admins can list users
    if (!isOrgAdmin(req.user)) {
      return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    }

    // SECURITY: Scope to user's organization to prevent cross-org data leak
    const orgId = (req.user as any)?.organization_id;
    if (!orgId) {
      return res.status(400).json({ error: "Bad Request", message: "User must belong to an organization" });
    }

    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const result = await query(
      'SELECT id, email, full_name, role, is_org_admin, created_at FROM users WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [orgId, limit, offset]
    );
    const countResult = await query('SELECT COUNT(*) as total FROM users WHERE organization_id = $1', [orgId]);
    const total = parseInt(countResult.rows[0].total);

    return res.json({
      data: result.rows,
      pagination: { limit, offset, total, hasMore: offset + result.rows.length < total }
    });
  } catch (err) {
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * @route GET /api/users/:cognitoId
 * @description Get a single user by their Cognito ID (admin only, same org)
 * @access Private (requires authMiddleware + admin role)
 */
router.get("/:cognitoId", authMiddleware, async (req, res) => {
  // Admin check
  if (!isOrgAdmin(req.user)) {
    return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
  }

  // SECURITY: Scope to user's organization
  const orgId = (req.user as any)?.organization_id;
  if (!orgId) {
    return res.status(400).json({ error: "Bad Request", message: "User must belong to an organization" });
  }

  const { cognitoId } = req.params;

  try {
    const result = await query(
      'SELECT id, email, full_name, role, is_org_admin, created_at FROM users WHERE cognito_id = $1 AND organization_id = $2',
      [cognitoId, orgId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Server Error" });
  }
});

export default router;