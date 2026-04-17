import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import { Request, Response, NextFunction } from "express";
import { findUserByCognitoId } from "../config/db";
import { getEffectiveOrganizationRole } from "../utils/organization";
import logger from "../utils/logger";

const userPoolId = process.env.AWS_USER_POOL_ID;
const clientId = process.env.AWS_CLIENT_ID;

/**
 * Custom JWKS cache that fetches with a longer timeout and retries.
 * The default aws-jwt-verify timeout is 1500ms which is too short on some
 * networks. This wrapper retries up to 3 times with a 5 second timeout.
 */
class RobustJwksCache extends SimpleJwksCache {
  async getJwks(uri: string) {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 5000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const response = await fetch(uri, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
          throw new Error(`JWKS fetch failed with status ${response.status}`);
        }
        const jwks = await response.json() as Parameters<SimpleJwksCache["addJwks"]>[1];
        this.addJwks(uri, jwks);
        logger.info({ attempt }, "Auth: JWKS fetched and cached");
        return jwks;
      } catch (err: any) {
        const isLast = attempt === MAX_RETRIES;
        logger.warn(
          { attempt, err: err?.message },
          isLast
            ? "Auth: JWKS fetch failed — all retries exhausted"
            : "Auth: JWKS fetch failed — retrying",
        );
        if (isLast) throw err;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    throw new Error("JWKS fetch failed after all retries");
  }
}

// Lazy initialization of verifier (only when credentials are available)
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier && userPoolId && clientId) {
    verifier = CognitoJwtVerifier.create(
      { userPoolId, clientId, tokenUse: "access" },
      { jwksCache: new RobustJwksCache() },
    );
  }
  return verifier;
}

// Pre-warm JWKS cache at startup so the first real request doesn't pay fetch cost.
// Skip this in tests because Jest imports the module repeatedly and the async
// hydration/retry path leaves open handles after the suite completes.
if (userPoolId && clientId && process.env.NODE_ENV !== "test") {
  const v = getVerifier();
  if (v) {
    v.hydrate()
      .then(() => logger.info("Auth: JWKS cache pre-warmed"))
      .catch((err: any) =>
        logger.warn(
          { err: err?.message },
          "Auth: JWKS pre-warm failed — will retry on first request",
        ),
      );
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const jwtVerifier = getVerifier();
    if (!jwtVerifier) {
      logger.error("Auth: Cognito not configured");
      return res
        .status(503)
        .json({ error: "Authentication service unavailable" });
    }

    // Token must come from the httpOnly cookie only.
    // Bearer header fallback is removed — cookies are the sole token transport.
    // This prevents scripts from injecting tokens via custom headers.
    const token: string | undefined = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // SECURITY: Signature verification is the first and mandatory gate.
    // jwtVerifier.verify() performs RS256 signature validation against
    // Cognito's published JWKS before it evaluates any claim (exp, iss,
    // client_id, token_use). A token with a missing or forged signature
    // never reaches claim inspection — it is rejected here.
    let payload;
    try {
      payload = await jwtVerifier.verify(token);
    } catch (jwtErr: any) {
      logger.warn(
        { jwtError: jwtErr?.message, jwtName: jwtErr?.name },
        "Auth: JWT verification failed",
      );
      const isExpired = jwtErr?.message?.includes("expired");
      return res.status(401).json({
        error: isExpired ? "Token expired" : "Invalid token",
      });
    }

    // Enforce that the access token came from an MFA-satisfied Cognito login.
    // We require the amr claim because the application treats Cognito MFA as a
    // hard gate for protected routes. If Cognito stops including the claim for a
    // valid MFA flow, the auth contract needs to be revisited explicitly.
    const amrClaim = (payload as any).amr as string[] | string | undefined;
    const amrValues = Array.isArray(amrClaim)
      ? amrClaim
      : typeof amrClaim === "string"
        ? [amrClaim]
        : [];
    const normalizedAmr = amrValues.map((value) => value.toLowerCase());
    const hasMfaSignal =
      normalizedAmr.includes("mfa") ||
      normalizedAmr.includes("software_token_mfa") ||
      normalizedAmr.includes("totp");

    const mfaVerifiedBySessionCookie = req.cookies?.mfaVerified === "true";

    if (!hasMfaSignal && !mfaVerifiedBySessionCookie) {
      return res.status(401).json({ error: "MFA verification required" });
    }

    // Cognito groups are preserved for diagnostics only. Application authorization
    // is derived from organization membership stored in the database.
    const cognitoGroups = (payload as any)["cognito:groups"] as
      | string[]
      | undefined;

    // Attach ONLY minimal claims to req.auth — never spread the full payload.
    req.auth = {
      sub: payload.sub,
      iss: payload.iss,
      jti: (payload as any).jti as string | undefined,
      exp: payload.exp,
      iat: payload.iat,
      cognitoGroups,
    } as any;

    // Resolve DB user — DB errors block the request (fail-closed on outage).
    // A missing DB record is allowed: GET /api/me creates the record on first
    // login, so new users must be able to reach that route with req.user unset.
    // Routes that require a fully-provisioned user (all routes except /me)
    // should check req.user themselves or use requireOrganization.
    try {
      const dbUser = await findUserByCognitoId(payload.sub);
      if (dbUser) {
        req.user = {
          ...dbUser,
        } as any;
      } else {
        logger.debug({ sub: payload.sub }, "Auth: no DB record yet — new user flow");
      }

    } catch (dbErr: any) {
      logger.error({ err: dbErr.message }, "Auth: database user lookup failed");
      return res.status(503).json({ error: "Authentication service temporarily unavailable" });
    }

    next();
  } catch (err: any) {
    logger.error({ err: err.message }, "Auth: unexpected error");
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
    // SECURITY: Must have an authenticated user with DB record
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Type-safe user extraction with property validation
    const user = req.user as any;
    if (!user || typeof user !== 'object') {
      return res.status(401).json({ error: "Authentication required" });
    }

    let userRole: string | undefined;
    try {
      userRole = getEffectiveOrganizationRole(user);
    } catch (err: any) {
      logger.error(
        { err: err?.message, userId: user.id },
        "requireRole: failed to get effective organization role"
      );
      return res.status(401).json({ error: "Authentication required" });
    }

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
