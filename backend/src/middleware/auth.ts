import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";
import { findUserByCognitoId } from "../config/db";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: "access",
});

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
    }

    // Verify Cognito access token
    const payload = await verifier.verify(token);

    // Lookup user in your PostgreSQL database
    const dbUser = await findUserByCognitoId(payload.sub);

    // Attach combined info to req.user
    (req as any).user = {
      ...payload,                  // Cognito claims
      role: dbUser?.role || null,  // Role from DB (could be null for new users)
      dbUser                       // Optional: full DB row if needed
    };

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid or expired token" });
  }
};
