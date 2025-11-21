import { Router } from "express";
import { query } from "../../config/db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const result = await query<{ now: string }>("SELECT NOW() as now");
    res.json({
      success: true,
      db: { now: result.rows[0]?.now },
    });
  } catch (error: any) {
    console.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      error: "Database connectivity failed",
    });
  }
});

export default router;
