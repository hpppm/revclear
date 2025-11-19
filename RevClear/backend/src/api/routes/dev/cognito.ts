import { Router } from "express";
import {
  clientId,
  userPoolId,
  checkCognitoConnectivity,
} from "../../../config/awsCognito";
import { authMiddleware } from "../../../middleware/auth";

const router = Router();

// Note: The base path for these routes will be /api/cognito

router.get("/check", authMiddleware, async (_req, res) => {
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
    console.error("Cognito connectivity check failed:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to reach Cognito.",
    });
  }
});

export default router;
