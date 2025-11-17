import { Router } from "express";

// Placeholder patient routes for development.
// Extend this router with real patient CRUD/queries as the domain model evolves.
const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Patients API placeholder is live." });
});

export default router;
