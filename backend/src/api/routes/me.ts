import { Router } from "express";
import { QueryResultRow } from "pg";
import { authMiddleware } from "../../middleware/auth";
import {
  findUserByCognitoId,
  findUserByEmail,
  updateUserCognitoId,
  createUser,
  query,
} from "../../config/db";
import { UpdateUserSchema } from "../../types/zod";
import { getUserOrganization } from "../../utils/organization";

const router = Router();

/**
 * @route GET /api/me
 * @description Get the current user's profile. Creates the user if none exists.
 * @access Private
 */
router.get("/", authMiddleware, async (req, res) => {
  const cognitoId = req.auth?.sub;
  const emailFromToken = req.auth?.email as string | undefined;
  const nameFromToken = req.auth?.name as string | undefined;

  // Stop early if Cognito ID is missing
  if (!cognitoId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Cognito ID (sub) not found in token.",
    });
  }

  // Fallback email so DB functions always get a real string
  const safeEmail: string =
    emailFromToken || `${cognitoId}@placeholder.local`;

  try {
    // 1. Check if middleware already resolved the user
    let user: QueryResultRow | null | undefined = req.user;

    if (user) {
      console.log(`[GET /api/me] User resolved by middleware:`, user.id);
      const organization = await getUserOrganization(user.id);
      if (!organization) {
        return res.json({
          success: true,
          requiresOrganization: true,
          message: "User must create or join an organization.",
          user,
          organization: null,
        });
      }
      return res.json({ success: true, user, organization });
    }

    // 2. If not found by middleware, try lookup by email (legacy/migration case)
    console.log(`[GET /api/me] User not found by middleware (Cognito ID mismatch?). Trying email...`);
    user = await findUserByEmail(safeEmail);

    if (user) {
      console.log(`[GET /api/me] Found user by email, updating Cognito ID...`);
      // Update the Cognito ID to match the current token
      user = await updateUserCognitoId(safeEmail, cognitoId);
      const organization = await getUserOrganization(user.id);
      if (!organization) {
        return res.json({
          success: true,
          requiresOrganization: true,
          message: "User must create or join an organization.",
          user,
          organization: null,
        });
      }
      return res.json({ success: true, user, organization });
    }

    // 3. Create new user
    console.log(`[GET /api/me] Creating new user...`);

    const fullName = nameFromToken || safeEmail;

    const newUser = await createUser(cognitoId, safeEmail, fullName);
    const organization = await getUserOrganization(newUser.id);

    return res.status(201).json({
      success: true,
      requiresOrganization: !organization,
      message: organization ? undefined : "User created. Please create or join an organization.",
      user: newUser,
      organization,
    });

  } catch (err: any) {
    console.error(`[GET /api/me] Error:`, err.message);
    return res.status(500).json({
      error: "Server Error",
      message: "Failed to fetch user profile",
    });
  }
});

/**
 * @route PATCH /api/me
 * @description Update the current user's profile/billing information.
 * @access Private
 */
router.patch("/", authMiddleware, async (req, res) => {
  const cognitoId = req.auth?.sub;

  if (!cognitoId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User Cognito ID not found in token.",
    });
  }

  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parsed.error.issues,
    });
  }

  const payload = parsed.data;
  const updatableFields: Array<keyof typeof payload> = [
    "full_name",
    "phone",
    "practitioner_type",
    "license_id",
    "license_state",
    "npi",
    "tax_id",
    "taxonomy_code",
    "provider_role",
  ];

  const setFragments: string[] = [];
  const values: any[] = [];

  updatableFields.forEach((field) => {
    if (payload[field] !== undefined) {
      values.push(payload[field] ?? null);
      setFragments.push(`${field} = $${values.length}`);
    }
  });

  if (setFragments.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  values.push(cognitoId);

  try {
    const result = await query(
      `UPDATE users SET ${setFragments.join(", ")} WHERE cognito_id = $${values.length} RETURNING id, cognito_id, email, full_name, role, phone, practitioner_type, license_id, license_state, npi, tax_id, taxonomy_code, provider_role, created_at`,
      values
    );

    const updatedUser = result.rows[0];
    if (!updatedUser) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found.",
      });
    }

    const organization = await getUserOrganization(updatedUser.id);
    return res.json({ ...updatedUser, organization });

  } catch (err: any) {
    console.error(`[PATCH /api/me] Error:`, err.message);
    return res.status(500).json({
      error: "Server Error",
      message: "Failed to update user profile",
    });
  }
});

export default router;
