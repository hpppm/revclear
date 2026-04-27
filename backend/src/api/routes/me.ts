import { Router } from "express";
import { QueryResultRow } from "pg";
import { authMiddleware } from "../../middleware/auth";
import { findUserByCognitoId, createUser, query, userColumns } from "../../config/db";
import { UpdateUserSchema } from "../../types/zod";
import {
  filterOrganizationForRole,
  getEffectiveOrganizationRole,
  getUserOrganization,
} from "../../utils/organization";
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

  // The Cognito access token carries `username` (the email for email-based pools).
  // Prefer it over a placeholder so the user record always has a real email.
  const tokenEmail: string | undefined = (req.auth as any)?.username;
  const isRealEmail = (e?: string) =>
    !!e && !e.endsWith("@placeholder.local") && !e.endsWith("@auto.local");

  const safeEmail: string = isRealEmail(tokenEmail)
    ? tokenEmail!
    : `${cognitoId}@placeholder.local`;

  try {
    // 1. Check if middleware already resolved the user by cognito_id
    let user: QueryResultRow | null | undefined = req.user;

    if (user) {
      logger.debug({ userId: user.id }, 'GET /api/me: user resolved');

      // Backfill placeholder email if we now have the real one from the token
      if (!isRealEmail(user.email) && isRealEmail(tokenEmail)) {
        try {
          const updated = await query(
            `UPDATE users SET email = $1 WHERE cognito_id = $2 RETURNING ${userColumns}`,
            [tokenEmail, cognitoId],
          );
          if (updated.rows[0]) {
            user = updated.rows[0];
            logger.info({ userId: user.id }, 'GET /api/me: placeholder email backfilled');
          }
        } catch (backfillErr: any) {
          // Non-fatal — log and continue with stale email
          logger.warn({ err: backfillErr.message }, 'GET /api/me: email backfill failed');
        }
      }

      const effectiveRole = getEffectiveOrganizationRole(user);
      const organization = await getUserOrganization(user.id);
      if (!organization) {
        return res.json({
          success: true,
          requiresOrganization: true,
          message: "User must create or join an organization.",
          user: { ...user, role: null },
          organization: null,
        });
      }
      return res.json({
        success: true,
        user: { ...user, role: effectiveRole },
        organization: filterOrganizationForRole(organization, effectiveRole),
      });
    }

    // 2. No user found by cognito_id - create new user
    // SECURITY: We do NOT fall back to email lookup to prevent account takeover
    logger.info({ cognitoId }, 'GET /api/me: creating new user');

    const newUser = await createUser(cognitoId, safeEmail, safeEmail);
    const organization = await getUserOrganization(newUser.id);

    return res.status(201).json({
      success: true,
      requiresOrganization: !organization,
      message: organization
        ? undefined
        : "User created. Please create or join an organization.",
      user: { ...newUser, role: null },
      organization: filterOrganizationForRole(organization, undefined),
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
    "first_name",
    "last_name",
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
      `UPDATE users SET ${setFragments.join(", ")} WHERE cognito_id = $${values.length} RETURNING ${userColumns}`,
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
    return res.json({
      ...updatedUser,
      role: getEffectiveOrganizationRole(updatedUser) ?? null,
      organization: filterOrganizationForRole(
        organization,
        getEffectiveOrganizationRole(updatedUser),
      ),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'PATCH /api/me: error');
    return res.status(500).json({
      error: "Server Error",
      message: "Failed to update user profile",
    });
  }
});

export default router;
