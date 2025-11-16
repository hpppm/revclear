import { Router } from "express";
import {
  uploadFile,
  deleteFile,
  listFiles,
  getDownloadUrl,
  bucketName,
} from "../config/awsS3";
import { clientId, userPoolId, checkCognitoConnectivity } from "../config/awsCognito";
import { testTableName } from "../config/awsDynamoDb";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const dashboardUsers = [
  {
    username: "clinic-a-user",
    email: "a@example.com",
    password: "Secret123!",
    group: "Clinic_A",
  },
  {
    username: "clinic-b-user",
    email: "b@example.com",
    password: "Secret123!",
    group: "Clinic_B",
  },
  {
    username: "clinic-c-user",
    email: "c@example.com",
    password: "Secret123!",
    group: "Clinic_C",
  },
];

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

router.get("/status", authMiddleware, (_req, res) => {
  const health = {
    awsS3: {
      bucket: bucketName,
      configured: Boolean(bucketName),
    },
    awsCognito: {
      userPoolId,
      clientId,
      configured: Boolean(userPoolId && clientId),
    },
    awsDynamoDb: {
      testTableName,
      configured: Boolean(testTableName),
    },
  };

  res.json({
    success: true,
    health,
    message:
      "AWS storage and auth services are configured according to environment variables.",
  });
});

router.post("/s3/upload", authMiddleware, async (req, res) => {
  const { key, body, contentType } = req.body || {};
  if (!key || body === undefined) {
    return res
      .status(400)
      .json({ error: "key and body are required for upload" });
  }

  const payload = typeof body === "string" ? body : JSON.stringify(body);
  try {
    const result = await uploadFile(
      key,
      payload,
      contentType || "application/json"
    );
    res.json({ success: true, bucket: bucketName, result });
  } catch (error: any) {
    console.error("Dashboard upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload to S3" });
  }
});

router.get("/s3/list", authMiddleware, async (req, res) => {
  try {
    const prefix =
      typeof req.query.prefix === "string" ? req.query.prefix : undefined;
    const result = await listFiles(prefix);
    res.json({ success: true, prefix, result });
  } catch (error: any) {
    console.error("Dashboard list error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to list S3 objects" });
  }
});

router.post("/s3/download-url", authMiddleware, async (req, res) => {
  const { key, expiresIn } = req.body || {};
  if (!key) {
    return res
      .status(400)
      .json({ error: "key is required to generate a download URL" });
  }

  try {
    const url = await getDownloadUrl(
      key,
      expiresIn ? Number(expiresIn) : undefined
    );
    res.json({ success: true, key, url });
  } catch (error: any) {
    console.error("Dashboard download URL error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create download URL" });
  }
});

router.delete("/s3/object", authMiddleware, async (req, res) => {
  const { key } = req.body || {};
  if (!key) {
    return res
      .status(400)
      .json({ error: "key is required to delete an object" });
  }

  try {
    const result = await deleteFile(key);
    res.json({ success: true, deletedKey: key, result });
  } catch (error: any) {
    console.error("Dashboard delete error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to delete S3 object" });
  }
});

router.get("/cognito/check", authMiddleware, async (_req, res) => {
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

function buildDashboardConfig() {
  return {
    userPoolId,
    clientId,
    bucketName: bucketName || null,
    testTableName: testTableName || null,
    dashboardUsers,
    dashboardS3File,
  };
}

export default router;
