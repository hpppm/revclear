import { Router } from "express";
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
  const cognitoId = req.user?.sub;
  const emailFromToken = req.user?.email;
  const nameFromToken = req.user?.name;

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
    console.log(
      `[GET /api/me] Looking up user with Cognito ID: ${cognitoId}, email: ${safeEmail}`
    );

    // 1. Try lookup by Cognito ID
    const userBySub = await findUserByCognitoId(cognitoId);
    if (userBySub) {
      const organization = await getUserOrganization(userBySub.id);
      return res.json({ ...userBySub, organization });
    }

    // 2. Try lookup by email if user was created earlier
    console.log(`[GET /api/me] Not found by Cognito ID. Trying email...`);

    const userByEmail = await findUserByEmail(safeEmail);
    if (userByEmail) {
      console.log(`[GET /api/me] Found user by email. Updating Cognito ID...`);

      const updated = await updateUserCognitoId(safeEmail, cognitoId);
      const organization = await getUserOrganization(updated.id);

      return res.json({ ...updated, organization });
    }

    // 3. Create new user
    console.log(`[GET /api/me] Creating new user...`);

    const fullName = nameFromToken || safeEmail;

    const newUser = await createUser(cognitoId, safeEmail, fullName);
    const organization = await getUserOrganization(newUser.id);

    return res.status(201).json({ ...newUser, organization });

  } catch (err: any) {
    console.error(`[GET /api/me] Error: ${err.message}`);
    return res.status(500).json({
      error: "Server Error",
      message: err.message,
    });
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
      `UPDATE users 
       SET ${setFragments.join(", ")} 
       WHERE cognito_id = $${values.length}
       RETURNING id, cognito_id, email, full_name, role, phone, practitioner_type, license_id, 
                 license_state, npi, tax_id, clinic_name, clinic_address_street, clinic_address_city, 
                 clinic_address_state, clinic_address_zip, clinic_phone, taxonomy_code, clinic_npi, 
                 provider_role, created_at`,
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
    console.error(`[PATCH /api/me] Error: ${err.message}`);
    return res.status(500).json({
      error: "Server Error",
      message: err.message,
    });
  }
});

export default router;
