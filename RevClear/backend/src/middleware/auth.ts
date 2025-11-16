import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/awsCognito'; // Import Cognito's verifyToken

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await verifyToken(token); // Use Cognito's verifyToken
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Cognito token verification failed:', error); // Log the error for debugging
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};