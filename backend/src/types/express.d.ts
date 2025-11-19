import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      uid: string;
    }

    interface Request {
      user?: User; // Decoded Cognito JWT payload
      file?: Express.Multer.File; // Multer file upload
    }
  }
}
