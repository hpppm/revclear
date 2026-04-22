import { Router, NextFunction, Request, Response } from "express";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { query } from "../../config/db";
import { adminDeleteUser } from "../../config/awsCognito";
import { deleteUserFromDb, deleteAllSessionsForUser } from "../../db/queries";
import logger from "../../utils/logger";

const router = Router();

/**
 * @route GET /api/users
 * @description Get a paginated list of users in the same organization (manager only)
 * @access Private (requires authMiddleware + clinician/admin role)
 * @query {number} limit - Max results (default 50, max 100)
 * @query {number} offset - Skip results (default 0)
 */
router.get("/", authMiddleware, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      success: true,
      data: result.rows,
      pagination: { limit, offset, total, hasMore: offset + result.rows.length < total }
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @route GET /api/users/:cognitoId
 * @description Get a single user by their Cognito ID (manager only, same org)
 * @access Private (requires authMiddleware + clinician/admin role)
 */
router.get("/:cognitoId", authMiddleware, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
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

    return res.json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
});

/**
 * @route DELETE /api/users/:cognitoId
 * @description Delete a user from both Cognito and the DB. Admin-only, scoped
 *   to the admin's own organization — cannot delete users from other orgs.
 *   Cognito deletion is attempted first; if it fails (e.g. user already
 *   deleted from Cognito console) we still remove the DB row so the two
 *   stores stay in sync.
 * @access Private (admin only)
 */
router.delete("/:cognitoId", authMiddleware, requireRole(["admin"]), async (req: Request, res: Response, next: NextFunction) => {
  const orgId = (req.user as any)?.organization_id;
  if (!orgId) {
    return res.status(400).json({ error: "User must belong to an organization" });
  }

  const { cognitoId } = req.params;

  // Prevent self-deletion
  if ((req.auth as any)?.sub === cognitoId) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  try {
    // 1. Remove from DB first (scoped to org — prevents cross-org deletion)
    const deleted = await deleteUserFromDb(cognitoId, orgId);
    if (!deleted) {
      return res.status(404).json({ error: "User not found." });
    }

    // 2. Invalidate all active sessions
    await deleteAllSessionsForUser(deleted.id).catch((err: unknown) =>
      logger.warn({ err: (err as { message?: string })?.message, cognitoId }, "users/delete: failed to clear active sessions"),
    );

    // 3. Delete from Cognito — fire-and-forget on UserNotFoundException since
    //    the user may have already been removed from the Cognito console.
    await adminDeleteUser(deleted.email).catch((err: unknown) => {
      const cognitoErr = err as { name?: string };
      if (cognitoErr?.name !== "UserNotFoundException") {
        logger.warn({ err: cognitoErr?.name, cognitoId }, "users/delete: Cognito deletion failed");
      }
    });

    logger.info({ cognitoId, orgId, deletedBy: (req.auth as any)?.sub }, "users/delete: user deleted");
    return res.status(200).json({ success: true, data: { message: "User deleted successfully." } });
  } catch (err) {
    return next(err);
  }
});

export default router;
