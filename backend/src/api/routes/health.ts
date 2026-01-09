import { Router } from "express";
import { query } from "../../config/db";
import { appConfig } from "../../config/appConfig";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await query<{ now: string }>("SELECT NOW() as now");
    res.json({
      success: true,
      status: "healthy",
      db: { connected: true },
      s3: { configured: Boolean(appConfig.aws.s3Bucket) },
      uptimeMs: Math.round(process.uptime() * 1000),
    });
  } catch (error: any) {
    // Don't leak error details
    res.status(503).json({ 
      success: false, 
      status: "unhealthy",
      message: "Service temporarily unavailable" 
    });
  }
});

export default router;
