import { Router, Request, Response, NextFunction } from "express";
import {
  clientId,
  userPoolId,
  checkCognitoConnectivity,
} from "../../../config/awsCognito";
import { authMiddleware } from "../../../middleware/auth";
import { getAuthenticatedUser } from "../../../utils/auth";
import logger from "../../../utils/logger";

const router = Router();

// Admin-only middleware for dev routes - prevents infrastructure detail exposure
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    if (user.role !== "admin" && user.role !== "superadmin") {
      logger.warn({ userId: user.id }, 'security: non-admin attempted dev Cognito route');
      return res.status(403).json({ success: false, message: "Admin access required for dev routes" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authorization check failed" });
  }
};

// Note: The base path for these routes will be /api/cognito

router.get("/check", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const result = await checkCognitoConnectivity();
    res.json({
      success: true,
      metadata: {
        userPoolId,
        clientId,
      },
      result,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'dev/cognito: connectivity check failed');
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to reach Cognito.",
    });
  }
});

export default router;
