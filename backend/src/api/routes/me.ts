import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { findUserByCognitoId, findUserByEmail, updateUserCognitoId, createUser } from "../../config/db";

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
    console.log(`[GET /api/me] Looking up user with Cognito ID: ${cognitoId}, email: ${email}`);
    let user = await findUserByCognitoId(cognitoId);

    if (user) {
      console.log(`[GET /api/me] Found existing user by Cognito ID:`, user);
      return res.json(user);
    }

    // Fallback: Try to find by email (in case Cognito ID changed)
    console.log(`[GET /api/me] User not found by Cognito ID, trying email lookup...`);
    user = await findUserByEmail(email);

    if (user) {
      console.log(`[GET /api/me] Found user by email, updating Cognito ID...`);
      // Update the Cognito ID to match the current token
      user = await updateUserCognitoId(email, cognitoId);
      return res.json(user);
    }

    console.log(`[GET /api/me] User not found, creating new user...`);

    // If no user, create one
    try {
      const fullName = name || email; // Use 'name' if available, otherwise fallback to 'email'
      user = await createUser(cognitoId, email, fullName);
      return res.status(201).json(user); // Return 201 for resource creation
    } catch (createError: any) {
      // Handle duplicate key error (user might have been created between check and insert)
      if (createError.code === '23505') {
        // Duplicate key - fetch the user again
        user = await findUserByCognitoId(cognitoId);
        if (user) {
          return res.json(user);
        }
        // If still no user after duplicate error, something is wrong
        return res.status(500).json({
          error: "Server Error",
          message: "User creation failed with duplicate key but user not found",
        });
      }
      // For other errors, throw to outer catch
      throw createError;
    }
  } catch (err) {
    const error = err as Error;
    console.error(`[GET /api/me] Error: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Server Error", message: error.message });
  }
});

export default router;
