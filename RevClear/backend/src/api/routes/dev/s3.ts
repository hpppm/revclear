import { Router } from "express";
import {
  uploadFile,
  deleteFile,
  listFiles,
  getDownloadUrl,
  bucketName,
} from "../../../config/awsS3";
import { authMiddleware } from "../../../middleware/auth";

const router = Router();

// Note: The base path for these routes will be /api/s3

router.post("/upload", authMiddleware, async (req, res) => {
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
    console.error("S3 upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload to S3" });
  }
});

router.get("/list", authMiddleware, async (req, res) => {
  try {
    const prefix =
      typeof req.query.prefix === "string" ? req.query.prefix : undefined;
    const result = await listFiles(prefix);
    res.json({ success: true, prefix, result });
  } catch (error: any) {
    console.error("S3 list error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to list S3 objects" });
  }
});

router.post("/download-url", authMiddleware, async (req, res) => {
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
    console.error("S3 download URL error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create download URL" });
  }
});

router.delete("/object", authMiddleware, async (req, res) => {
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
    console.error("S3 delete error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to delete S3 object" });
  }
});

export default router;
