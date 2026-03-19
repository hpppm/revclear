import { Request } from "express";

/**
 * Minimal JWT claims attached to req.auth after token verification.
 * Deliberately does NOT extend the full CognitoJwtPayload — we only
 * attach fields needed for authorization and audit. This prevents
 * username, device_key, scope, client_id, origin_jti, event_id, and
 * other claims from leaking into route handlers.
 */
interface ExtendedCognitoJwtPayload {
  /** Cognito user sub (stable, unique per user) */
  sub: string;
  /** Token issuer — identifies the Cognito user pool */
  iss: string;
  /** JWT ID — used for replay detection in audit logs */
  jti?: string;
  /** Expiry (unix epoch) */
  exp: number;
  /** Issued-at (unix epoch) */
  iat: number;
  /** Raw Cognito group names extracted from the token */
  cognitoGroups?: string[];
  /** Application role derived from cognitoGroups */
  cognitoRole?: string;
}

declare global {
  namespace Express {
    // The "User" interface now represents our Database User
    interface User {
      id: string;
      email: string;
      full_name: string;
      role?: string; // Derived from Cognito groups: 'admin' | 'clinician' | 'nurse' | 'billing_staff' | 'receptionist'
      cognito_id: string;
      organization_id?: string;
      is_org_admin?: boolean;
      [key: string]: any; // Allow other DB columns
    }

    // Define Organization interface (simplified version of DB schema)
    interface Organization {
      id: string;
      name: string;
      [key: string]: any;
    }

    interface Request {
      auth?: ExtendedCognitoJwtPayload; // The raw JWT payload from Cognito with groups
      user?: User; // The resolved database user with role from Cognito
      organization?: Organization; // The resolved organization
      file?: Express.Multer.File; // Multer file upload
    }
  }
}
