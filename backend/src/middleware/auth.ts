import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";
import { findUserByCognitoId } from "../config/db";
import logger from "../utils/logger";

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

/**
 * Map Cognito group names to application roles.
 * Cognito groups: "Admin", "Users"
 * Application roles: "admin", "clinician", "billing_staff"
 *
 * IMPORTANT: Cognito group membership is the source of truth for roles.
 * The `cognito:groups` claim is automatically included in access tokens
 * when a user belongs to a Cognito User Pool group.
 */
function mapCognitoGroupsToRole(groups: string[] | undefined): string {
  if (!groups || groups.length === 0) {
    return "clinician"; // Default role for users not in any group
  }
  // Admin group takes precedence
  if (groups.includes("Admin")) {
    return "admin";
  }
  // Users group maps to clinician
  if (groups.includes("Users")) {
    return "clinician";
  }
  return "clinician"; // Default fallback
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const jwtVerifier = getVerifier();
    if (!jwtVerifier) {
      logger.error('Auth: Cognito not configured');
      return res
        .status(503)
        .json({ error: "Authentication service unavailable" });
    }

    // Try to get token from httpOnly cookie first (more secure)
    // Fall back to Authorization header for backward compatibility
    let token: string | undefined;

    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else {
      const authHeader = req.headers.authorization || "";
      const [type, headerToken] = authHeader.split(" ");
      if (type === "Bearer" && headerToken) {
        token = headerToken;
      }
    }

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let payload;
    try {
      payload = await jwtVerifier.verify(token);
    } catch (jwtErr: any) {
      const isExpired = jwtErr?.message?.includes("expired");
      return res.status(401).json({
        error: isExpired ? "Token expired" : "Invalid token",
      });
    }

    // Extract Cognito groups from JWT and map to application role
    // The `cognito:groups` claim contains an array of group names
    const cognitoGroups = (payload as any)["cognito:groups"] as
      | string[]
      | undefined;
    const cognitoRole = mapCognitoGroupsToRole(cognitoGroups);

    // Attach JWT payload with derived role
    req.auth = {
      ...payload,
      cognitoGroups,
      cognitoRole,
    } as any;

    // Resolve DB user — database errors should not block authentication
    try {
      const dbUser = await findUserByCognitoId(payload.sub);
      if (dbUser) {
        req.user = {
          ...dbUser,
          role: cognitoRole,
        } as any;
      }
    } catch (dbErr: any) {
      logger.error({ err: dbErr.message }, 'Auth: database user lookup failed');
      // Continue without DB user — routes like /me can handle missing user
    }

    next();
  } catch (err: any) {
    logger.error({ err: err.message }, 'Auth: unexpected error');
    return res.status(503).json({
      error: "Authentication service temporarily unavailable",
    });
  }
};

/**
 * Middleware to require specific roles for route access.
 * Must be used AFTER authMiddleware.
 *
 * @param allowedRoles - Array of roles that can access the route
 * @example router.get('/admin-only', authMiddleware, requireRole(['admin']), handler)
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || (req.auth as any)?.cognitoRole;

    if (!userRole) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};
