import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { query } from "../../config/db";

const router = Router();

/**
 * @route GET /api/users
 * @description Get a list of all users. (Authorization TBD)
 * @access Private (requires authMiddleware)
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    // TODO: Add more robust authorization here. For now, any authenticated user can list all.
    const result = await query('SELECT id, cognito_id, email, full_name, role, created_at FROM users');
    return res.json(result.rows);
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