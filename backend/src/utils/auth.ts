import { Request } from "express";
import { findUserByCognitoId } from "../config/db";

export type AuthenticatedUser = Awaited<ReturnType<typeof findUserByCognitoId>>;

/**
 * Resolve the application user for the current request.
 * The user is now resolved in the authMiddleware and attached to req.user.
 */
export const getAuthenticatedUser = async (
  req: Request
): Promise<AuthenticatedUser | null> => {
  return (req.user as AuthenticatedUser) || null;
};
