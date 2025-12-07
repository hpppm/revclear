import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";
import { findUserByCognitoId } from "../config/db";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.AWS_USER_POOL_ID!,
  clientId: process.env.AWS_CLIENT_ID!,
  tokenUse: "access",
});

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const payload = await verifier.verify(token);
    req.auth = payload; // Attach raw JWT payload

    // Resolve DB user
    const dbUser = await findUserByCognitoId(payload.sub);
    if (dbUser) {
      req.user = dbUser as any; // Attach DB user
    } else {
      // User not found in DB (first login?)
      // We leave req.user undefined, but req.auth is present.
      // Downstream routes (like /me) can handle creation.
    }

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};
