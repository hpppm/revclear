import { Request } from 'express';
import { CognitoJwtPayload } from "aws-jwt-verify/jwt-model";

declare global {
  namespace Express {
    // The "User" interface now represents our Database User
    interface User {
      id: string;
      email: string;
      full_name: string;
      role?: string;
      cognito_id: string;
      organization_id?: string;
      [key: string]: any; // Allow other DB columns
    }

    // Define Organization interface (simplified version of DB schema)
    interface Organization {
      id: string;
      name: string;
      [key: string]: any;
    }

    interface Request {
      auth?: CognitoJwtPayload; // The raw JWT payload from Cognito
      user?: User; // The resolved database user
      organization?: Organization; // The resolved organization
      file?: Express.Multer.File; // Multer file upload
    }
  }
}
