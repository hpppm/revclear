import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { findUserByCognitoId, createUser } from "../../config/db";

const router = Router();

/**
 * @route GET /api/me
 * @description Get the current user's profile. Creates the user if they don't exist.
 * @access Private
 */
router.get("/", authMiddleware, async (req, res) => {
  const cognitoId = req.user?.sub;
  const email = req.user?.email;
  const name = req.user?.name; // Assuming 'name' is available in the decoded token

  if (!cognitoId || !email) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User Cognito ID or email not found in token.",
    });
  }

  try {
    let user = await findUserByCognitoId(cognitoId);

    if (user) {
      return res.json(user);
    }

    // If no user, create one
    const fullName = name || email; // Use 'name' if available, otherwise fallback to 'email'
    user = await createUser(cognitoId, email, fullName);
    return res.status(201).json(user); // Return 201 for resource creation
  } catch (err) {
    const error = err as Error;
    console.error(`[GET /api/me] Error: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Server Error", message: error.message });
  }
});

export default router;
