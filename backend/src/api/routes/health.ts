import { Router } from "express";
import { query } from "../../config/db";
import { getAiProviderHealthReport } from "../../services/ai/providerHealth";
import { authMiddleware, requireRole } from "../../middleware/auth";

const router = Router();

// Liveness probe: process is running and can serve HTTP.
// Keep this lightweight and dependency-free for platform health checks.
router.get("/", async (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
  });
});

// Readiness probe: verifies critical dependencies are reachable.
router.get("/ready", async (_req, res) => {
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
router.get("/ai", authMiddleware, requireRole(['admin']), async (_req, res) => {
  try {
    const report = await getAiProviderHealthReport();
    const statusCode = report.overallHealthy ? 200 : 503;

    res.status(statusCode).json({
      success: report.overallHealthy,
      status: report.overallHealthy ? "healthy" : "degraded",
      // SECURITY: Omit aiServerHealthUrl — it reveals internal infrastructure URLs.
      data: {
        model: {
          healthy: report.model.healthy,
          message: report.model.message,
        },
        groq: {
          healthy: report.groq.healthy,
          message: report.groq.message,
        },
        assemblyai: {
          healthy: report.assemblyai.healthy,
          message: report.assemblyai.message,
        },
        pinecone: {
          healthy: report.pinecone.healthy,
          message: report.pinecone.message,
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
