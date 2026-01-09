import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";

const router = Router();

/**
 * @route GET /api/users
 * @description Get a paginated list of all users. (Authorization TBD)
 * @access Private (requires authMiddleware)
 * @query {number} limit - Max results (default 50, max 100)
 * @query {number} offset - Skip results (default 0)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Note: Consider adding admin role check for production
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    
    const result = await query(
      'SELECT id, cognito_id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const countResult = await query('SELECT COUNT(*) as total FROM users');
    const total = parseInt(countResult.rows[0].total);
    
    return res.json({
      data: result.rows,
      pagination: { limit, offset, total, hasMore: offset + result.rows.length < total }
    });
  } catch (err) {
    const error = err as Error;
    console.error(`[GET /api/users] Error: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Server Error", message: error.message });
  }
});

/**
 * @route GET /api/users/:cognitoId
 * @description Get a single user by their Cognito ID.
 * @access Private (requires authMiddleware)
 */
router.get("/:cognitoId", authMiddleware, async (req, res) => {
  const { cognitoId } = req.params;

  try {
    const result = await query('SELECT id, cognito_id, email, full_name, role, created_at FROM users WHERE cognito_id = $1', [cognitoId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "Not Found", message: "User not found." });
    }

    return res.json(user);
  } catch (err) {
    const error = err as Error;
    console.error(`[GET /api/users/:cognitoId] Error: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Server Error", message: error.message });
  }
});

export default router;