import { Router } from "express";
import { query } from "../../config/db";
import { appConfig } from "../../config/appConfig";
import { sendError } from "../../utils/httpResponses";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await query<{ now: string }>("SELECT NOW() as now");
    res.json({
      success: true,
      db: { now: result.rows[0]?.now },
      s3: appConfig.aws.s3Bucket
        ? { configured: true, bucket: appConfig.aws.s3Bucket }
        : { configured: false, error: "AWS_S3_BUCKET not set" },
      env: appConfig.env,
      uptimeMs: Math.round(process.uptime() * 1000),
    });
  } catch (error: any) {
    console.error("Health check failed:", error);
    sendError(res, 500, "Database connectivity failed");
  }
});

export default router;
