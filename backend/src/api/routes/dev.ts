import { Router } from "express";
import s3Routes from "./dev/s3";
import cognitoRoutes from "./dev/cognito";
import statusRoutes from "./dev/status";
import aiRoutes from "./dev/ai";
import dbRoutes from "./dev/db";
import { authMiddleware } from "../../middleware/auth";
import { getAuthenticatedUser } from "../../utils/auth";

// Imports needed for the new /config route
import { userPoolId, clientId } from "../../config/awsCognito";
import { bucketName } from "../../config/awsS3";

const router = Router();

// --- Test Data for /config endpoint ---
const dashboardS3File = {
  key: "test-reports/encounter-a.json",
  contentType: "application/json",
  body: {
    patientId: "A",
    encounterDate: "2025-09-01",
    clinic: "Clinic_A",
    note: "Generated from dashboard tester",
  },
};

function buildDashboardConfig() {
  return {
    userPoolId,
    clientId,
    bucketName: bucketName || null,
    dashboardS3File,
  };
}

// --- Route Registration ---

// SECURITY: /config route restricted to admin users only (exposes AWS infrastructure details)
router.get("/config", authMiddleware, async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Admin access required for dev config",
      });
    }
    res.json({ success: true, config: buildDashboardConfig() });
  } catch (error: any) {
    // Don't leak error details
    res.status(500).json({
      success: false,
      error: "Dashboard config is unavailable.",
    });
  }
});

// All routes mounted here will be under /api/dev
router.use("/s3", s3Routes);
router.use("/cognito", cognitoRoutes);
router.use("/status", statusRoutes);
router.use("/ai", aiRoutes);
router.use("/db", dbRoutes);

export default router;
