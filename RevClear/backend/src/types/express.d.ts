import { Request } from 'express';
import * as admin from 'firebase-admin';

declare global {
  namespace Express {
    interface Request {
      user?: admin.auth.DecodedIdToken;
    }
  }
}
