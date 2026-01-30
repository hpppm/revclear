import { Router, Request, Response, NextFunction } from "express";
import {
  uploadFile,
  deleteFile,
  listFiles,
  getDownloadUrl,
  bucketName,
} from "../../../config/awsS3";
import { authMiddleware } from "../../../middleware/auth";
import { getAuthenticatedUser } from "../../../utils/auth";

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
      console.warn(`[SECURITY] Non-admin user ${user.id} attempted to access dev S3 route`);
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

export default router;
