import { Router } from "express";
import { query } from "../../config/db";
import { getAiProviderHealthReport } from "../../services/ai/providerHealth";
import { authMiddleware } from "../../middleware/auth";

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

// SECURITY: AI health is restricted to authenticated users only.
// Provider URLs and model names are stripped from the response to avoid
// leaking infrastructure details that could aid reconnaissance.
router.get("/ai", authMiddleware, async (_req, res) => {
  try {
    const report = await getAiProviderHealthReport();
    const statusCode = report.overallHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: report.overallHealthy,
      status: report.overallHealthy ? "healthy" : "degraded",
      // SECURITY: Omit aiServerHealthUrl — it reveals internal infrastructure URLs.
      data: {
        aiServer: {
          healthy: report.aiServer.healthy,
          message: report.aiServer.message,
        },
      },
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
