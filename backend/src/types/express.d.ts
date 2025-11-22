import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      uid?: string; // Keep existing but make optional, or remove if not used
      sub: string; // Cognito User ID
      email: string; // User's email
      name?: string; // User's name (optional from Cognito)
    }

    interface Request {
      user?: User; // Decoded Cognito JWT payload
      file?: Express.Multer.File; // Multer file upload
    }
  }
}
