import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Request, Response, NextFunction } from "express";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.AWS_USER_POOL_ID!,
  clientId: process.env.AWS_CLIENT_ID!,
  tokenUse: "access",
});

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const payload = await verifier.verify(token);
    (req as any).user = payload;

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
};
