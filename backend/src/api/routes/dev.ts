import { Router } from "express";
import s3Routes from "./dev/s3";
import cognitoRoutes from "./dev/cognito";
import statusRoutes from "./dev/status";
import dynamodbRoutes from "./dev/dynamodb";
import genkitRoutes from "./dev/genkit";
import dbRoutes from "./dev/db";

// Imports needed for the new /config route
import { userPoolId, clientId } from "../../config/awsCognito";
import { bucketName } from "../../config/awsS3";
import { testTableName } from "../../config/awsDynamoDb";

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
    testTableName: testTableName || null,
    dashboardS3File,
  };
}

// --- Route Registration ---

// New /config route
router.get("/config", (_req, res) => {
  try {
    res.json({ success: true, config: buildDashboardConfig() });
  } catch (error: any) {
    console.error("Failed to load dashboard config:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Dashboard config is unavailable.",
    });
  }
});

// All routes mounted here will be under /api/dev
router.use("/s3", s3Routes);
router.use("/cognito", cognitoRoutes);
router.use("/status", statusRoutes);
router.use("/dynamodb", dynamodbRoutes);
router.use("/genkit", genkitRoutes);
router.use("/db", dbRoutes);

export default router;
