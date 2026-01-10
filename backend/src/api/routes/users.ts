import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";

const router = Router();

// Helper to check if user is admin
const isAdmin = (user: any): boolean => {
  return user?.role === 'admin';
};

/**
 * @route GET /api/users
 * @description Get a paginated list of all users (admin only)
 * @access Private (requires authMiddleware + admin role)
 * @query {number} limit - Max results (default 50, max 100)
 * @query {number} offset - Skip results (default 0)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Admin check - only admins can list all users
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
    }

    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    
    const result = await query(
      'SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const countResult = await query('SELECT COUNT(*) as total FROM users');
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
 * @description Get a single user by their Cognito ID (admin only)
 * @access Private (requires authMiddleware + admin role)
 */
router.get("/:cognitoId", authMiddleware, async (req, res) => {
  // Admin check
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
  }

  const { cognitoId } = req.params;

  try {
    const result = await query('SELECT id, email, full_name, role, created_at FROM users WHERE cognito_id = $1', [cognitoId]);
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