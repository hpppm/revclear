import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { findUserByCognitoId, findUserByEmail, updateUserCognitoId, createUser, query } from "../../config/db";
import { UpdateUserSchema } from "../../types/zod";
import { getUserOrganization } from "../../utils/organization";

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
      const organization = await getUserOrganization(user.id);
      return res.json({ ...user, organization });
    }

    // Fallback: Try to find by email (in case Cognito ID changed)
    console.log(`[GET /api/me] User not found by Cognito ID, trying email lookup...`);
    user = await findUserByEmail(email);

    if (user) {
      console.log(`[GET /api/me] Found user by email, updating Cognito ID...`);
      // Update the Cognito ID to match the current token
      user = await updateUserCognitoId(email, cognitoId);
      const organization = await getUserOrganization(user.id);
      return res.json({ ...user, organization });
    }

    console.log(`[GET /api/me] User not found, creating new user...`);

    // If no user, create one
    try {
      const fullName = name || email; // Use 'name' if available, otherwise fallback to 'email'
      user = await createUser(cognitoId, email, fullName);
      const organization = await getUserOrganization(user.id);
      return res.status(201).json({ ...user, organization }); // Return 201 for resource creation
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

/**
 * @route PATCH /api/me
 * @description Update the current user's profile/billing information.
 * @access Private
 */
router.patch("/", authMiddleware, async (req, res) => {
  const cognitoId = req.user?.sub;

  if (!cognitoId) {
    return res.status(401).json({ error: "Unauthorized", message: "User Cognito ID not found in token." });
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
    "clinic_name",
    "clinic_address_street",
    "clinic_address_city",
    "clinic_address_state",
    "clinic_address_zip",
    "clinic_phone",
    "taxonomy_code",
    "clinic_npi",
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
      `UPDATE users SET ${setFragments.join(", ")} WHERE cognito_id = $${values.length} RETURNING id, cognito_id, email, full_name, role, phone, practitioner_type, license_id, license_state, npi, tax_id, clinic_name, clinic_address_street, clinic_address_city, clinic_address_state, clinic_address_zip, clinic_phone, taxonomy_code, clinic_npi, provider_role, created_at`,
      values
    );

    const updatedUser = result.rows[0];
    if (!updatedUser) {
      return res.status(404).json({ error: "Not Found", message: "User not found." });
    }

    const organization = await getUserOrganization(updatedUser.id);
    return res.json({ ...updatedUser, organization });
  } catch (err) {
    const error = err as Error;
    console.error(`[PATCH /api/me] Error: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Server Error", message: error.message });
  }
});

export default router;
