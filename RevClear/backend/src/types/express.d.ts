import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: any; // Decoded Cognito JWT payload
    }
  }
}
