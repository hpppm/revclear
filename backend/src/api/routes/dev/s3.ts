import { Router, Request, Response, NextFunction } from "express";
import {
  uploadFile,
  deleteFile,
  listFiles,
  getDownloadUrl,
  getScopedS3Client,
  bucketName,
} from "../../../config/awsS3";
import { getScopedCredentials } from "../../../config/awsIdentityPool";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authMiddleware } from "../../../middleware/auth";
import { getAuthenticatedUser } from "../../../utils/auth";
import logger from "../../../utils/logger";

const router = Router();

// Admin-only middleware for dev routes - CRITICAL: These routes access all S3 data
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    // Check for admin role - adjust field name based on your user model
    if (user.role !== "admin" && user.role !== "superadmin") {
      logger.warn({ userId: user.id }, 'security: non-admin attempted dev S3 route');
      return res.status(403).json({ success: false, message: "Admin access required for dev routes" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authorization check failed" });
  }
};

// Note: The base path for these routes will be /api/s3

router.post("/upload", authMiddleware, adminOnly, async (req, res) => {
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
    res.status(500).json({ error: "Failed to upload file" });
  }
});

router.get("/list", authMiddleware, adminOnly, async (req, res) => {
  try {
    const prefix =
      typeof req.query.prefix === "string" ? req.query.prefix : undefined;
    const result = await listFiles(prefix);
    res.json({ success: true, prefix, result });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to list files" });
  }
});

router.post("/download-url", authMiddleware, adminOnly, async (req, res) => {
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
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

router.delete("/object", authMiddleware, adminOnly, async (req, res) => {
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
    res.status(500).json({ error: "Failed to delete file" });
  }
});

/**
 * GET /api/s3/identity-test
 *
 * Tests that Identity Pool credential scoping works correctly.
 * Exchanges the caller's Cognito token for scoped credentials, then:
 *   1. Tries to list objects under audio/  → should succeed for all roles
 *   2. Tries to generate a presigned URL for audio/ → should succeed
 *   3. Tries to list objects under ai/     → should fail for clinicians,
 *                                             succeed for admins
 *
 * Returns a per-check pass/fail summary without exposing raw credentials.
 */
router.get("/identity-test", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const accessToken = (req as any).cookies?.accessToken;
    if (!accessToken) {
      return res.status(400).json({ success: false, message: "No accessToken cookie found" });
    }

    // Exchange Cognito token for Identity Pool scoped credentials
    let creds;
    try {
      creds = await getScopedCredentials(user.id, accessToken);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: "Identity Pool credential exchange failed",
        error: err?.message,
      });
    }

    const scopedClient = getScopedS3Client(creds);
    const results: Record<string, { pass: boolean; detail: string }> = {};

    // Test 1: list audio/ prefix — must pass for every role
    try {
      await scopedClient.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "audio/",
        MaxKeys: 1,
      }));
      results["list_audio"] = { pass: true, detail: "s3:ListBucket on audio/ — allowed" };
    } catch (err: any) {
      results["list_audio"] = { pass: false, detail: err?.message };
    }

    // Test 2: generate a presigned download URL for audio/ — must pass for every role
    try {
      const url = await getDownloadUrl("audio/test-scope-check.webm", 60, scopedClient);
      results["presign_audio"] = {
        pass: true,
        detail: `Presigned URL generated (expires 60s) — ${url.substring(0, 80)}...`,
      };
    } catch (err: any) {
      results["presign_audio"] = { pass: false, detail: err?.message };
    }

    // Test 3: list ai/ prefix — must FAIL for clinicians, pass for admins
    try {
      await scopedClient.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: "ai/",
        MaxKeys: 1,
      }));
      results["list_ai"] = {
        pass: user.role === "admin",
        detail: user.role === "admin"
          ? "s3:ListBucket on ai/ — allowed (admin)"
          : "s3:ListBucket on ai/ — should have been denied for clinician",
      };
    } catch (err: any) {
      results["list_ai"] = {
        pass: user.role !== "admin",
        detail: user.role !== "admin"
          ? "s3:ListBucket on ai/ — correctly denied for clinician"
          : `Admin was denied ai/ — unexpected: ${err?.message}`,
      };
    }

    const allPassed = Object.values(results).every((r) => r.pass);

    res.json({
      success: allPassed,
      userId: user.id,
      role: user.role,
      credentialExpiration: creds.expiration,
      checks: results,
    });
  } catch (err: any) {
    logger.error({ err }, "identity-test: unexpected error");
    res.status(500).json({ success: false, message: "Test failed unexpectedly" });
  }
});

export default router;
