import { Router } from "express";
import { query } from "../../config/db";
import { getAiProviderHealthReport } from "../../services/ai/providerHealth";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await query<{ now: string }>("SELECT NOW() as now");
    // SECURITY: Only return minimal health status - no infrastructure details
    res.json({
      success: true,
      status: "healthy",
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

router.get("/ai", async (_req, res) => {
  try {
    const report = await getAiProviderHealthReport();
    const statusCode = report.overallHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: report.overallHealthy,
      status: report.overallHealthy ? "healthy" : "degraded",
      data: report,
    });
  } catch (_error: any) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      message: "AI provider health check failed",
    });
  }
});

export default router;
