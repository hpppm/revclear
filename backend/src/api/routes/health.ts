import { Router } from "express";
import { query } from "../../config/db";

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

export default router;
