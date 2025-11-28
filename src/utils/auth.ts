import { Request } from "express";
import { findUserByCognitoId } from "../config/db";

export type AuthenticatedUser = Awaited<ReturnType<typeof findUserByCognitoId>>;

/**
 * Resolve the application user for the current request based on the Cognito `sub`.
 */
export const getAuthenticatedUser = async (
  req: Request
): Promise<AuthenticatedUser | null> => {
  const cognitoId = (req as any)?.user?.sub as string | undefined;
  if (!cognitoId) return null;

  const user = await findUserByCognitoId(cognitoId);
  return user ?? null;
};
