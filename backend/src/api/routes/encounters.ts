import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

// Stub endpoints; full CRUD implemented in ticket 8.
router.get("/", authMiddleware, (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Encounters endpoint stub. Full implementation in ticket 8.",
  });
});

export default router;
