import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  // Placeholder stub: to be implemented in ticket 7 with DB integration.
  res.json({
    success: true,
    user: {
      id: null,
      status: "stub",
      message: "Implement /api/me in ticket 7",
    },
  });
});

export default router;
