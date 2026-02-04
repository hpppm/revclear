import { Request } from "express";
import { CognitoJwtPayload } from "aws-jwt-verify/jwt-model";

// Extended JWT payload with Cognito groups
interface ExtendedCognitoJwtPayload extends CognitoJwtPayload {
  "cognito:groups"?: string[];
  cognitoGroups?: string[];
  cognitoRole?: string;
}

declare global {
  namespace Express {
    // The "User" interface now represents our Database User
    interface User {
      id: string;
      email: string;
      full_name: string;
      role?: string; // Derived from Cognito groups: 'admin' | 'clinician' | 'billing_staff'
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
