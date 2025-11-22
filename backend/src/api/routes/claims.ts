import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

// Stub endpoints; full implementation will follow in claims workstream.
router.get("/", authMiddleware, (_req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Claims endpoint stub. Full implementation in later ticket.",
  });
});

export default router;
