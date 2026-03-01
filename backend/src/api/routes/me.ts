import { Router } from "express";
import { QueryResultRow } from "pg";
import { authMiddleware } from "../../middleware/auth";
import { findUserByCognitoId, createUser, query } from "../../config/db";
import { UpdateUserSchema } from "../../types/zod";
import { getUserOrganization } from "../../utils/organization";
import logger from "../../utils/logger";

const router = Router();

/**
 * @route GET /api/me
 * @description Get the current user's profile. Creates the user if none exists.
 * @access Private
 *
 * SECURITY: User lookup is ONLY by cognito_id (JWT sub claim).
 * Email-based fallback was removed to prevent account takeover attacks
 * where a user with a valid token could claim another user's account.
 */
router.get("/", authMiddleware, async (req, res) => {
  const cognitoId = req.auth?.sub;

  // Stop early if Cognito ID is missing
  if (!cognitoId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Cognito ID (sub) not found in token.",
    });
  }

  // Access tokens do not carry email/name claims (those are ID token claims).
  // Use a deterministic placeholder for new user creation; the user can
  // update their profile via PATCH /api/me afterwards.
  const safeEmail: string = `${cognitoId}@placeholder.local`;

  try {
    // 1. Check if middleware already resolved the user by cognito_id
    let user: QueryResultRow | null | undefined = req.user;

    if (user) {
      logger.debug({ userId: user.id }, 'GET /api/me: user resolved');
      // Include role from Cognito groups in response
      const cognitoRole = req.auth?.cognitoRole || user.role;
      const organization = await getUserOrganization(user.id);
      if (!organization) {
        return res.json({
          success: true,
          requiresOrganization: true,
          message: "User must create or join an organization.",
          user: { ...user, role: cognitoRole },
          organization: null,
        });
      }
      return res.json({
        success: true,
        user: { ...user, role: cognitoRole },
        organization,
      });
    }

    // 2. No user found by cognito_id - create new user
    // SECURITY: We do NOT fall back to email lookup to prevent account takeover
    logger.info({ cognitoId }, 'GET /api/me: creating new user');

    const fullName = safeEmail;
    const cognitoRole = req.auth?.cognitoRole || "clinician";

    const newUser = await createUser(cognitoId, safeEmail, fullName);
    const organization = await getUserOrganization(newUser.id);

    return res.status(201).json({
      success: true,
      requiresOrganization: !organization,
      message: organization
        ? undefined
        : "User created. Please create or join an organization.",
      user: { ...newUser, role: cognitoRole },
      organization,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'GET /api/me: error');
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
      values,
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
    logger.error({ err: err.message }, 'PATCH /api/me: error');
    return res.status(500).json({
      error: "Server Error",
      message: "Failed to update user profile",
    });
  }
});

export default router;
