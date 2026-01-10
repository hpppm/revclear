import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";
import { findUserByCognitoId } from "../config/db";

const userPoolId = process.env.AWS_USER_POOL_ID;
const clientId = process.env.AWS_CLIENT_ID;

// Lazy initialization of verifier (only when credentials are available)
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier && userPoolId && clientId) {
    verifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: "access",
    });
  }
  return verifier;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jwtVerifier = getVerifier();
    if (!jwtVerifier) {
      console.error("[Auth] Cognito not configured");
      return res.status(503).json({ error: "Authentication service unavailable" });
    }

    const authHeader = req.headers.authorization || "";
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = await jwtVerifier.verify(token);
    req.auth = payload; // Attach raw JWT payload

    // Resolve DB user
    const dbUser = await findUserByCognitoId(payload.sub);
    if (dbUser) {
      req.user = dbUser as any; // Attach DB user
    }
    // If no DB user, req.user stays undefined - routes like /me can handle creation

    next();
  } catch (err: any) {
    // Don't leak JWT verification details
    const isExpired = err?.message?.includes("expired");
    return res.status(401).json({ 
      error: isExpired ? "Token expired" : "Invalid token" 
    });
  }
};
