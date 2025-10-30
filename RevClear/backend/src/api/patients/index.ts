import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  res.json({ message: "List of patients (secured)" });
});

router.post("/", authMiddleware, async (req, res) => {
  res.json({ message: "Patient created (secured)" });
});

export default router;
