import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/context";
import { EncounterService } from "../../services/encounterService";
import { CreateEncounterSchema, UpdateEncounterSchema, IdParamSchema } from "../../types/zod";

const router = Router();

// GET all encounters (scoped to organization)
router.get("/", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const encounters = await EncounterService.findAll(
      req.organization!.id,
      req.user!.id
    );
    res.json({ success: true, data: encounters });
  } catch (error) {
    next(error);
  }
});

// GET encounter by ID
router.get("/:id", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }
    const { id } = parsedParams.data;

    const encounter = await EncounterService.findById(
      id,
      req.organization!.id,
      req.user!.id
    );

    if (!encounter) {
      return res.status(404).json({ success: false, message: "Encounter not found" });
    }
    res.json({ success: true, data: encounter });
  } catch (error) {
    next(error);
  }
});

// CREATE a new encounter
router.post("/", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedBody = CreateEncounterSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const encounter = await EncounterService.create(
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.status(201).json({ success: true, data: encounter });
  } catch (error) {
    next(error);
  }
});

// UPDATE an encounter
router.put("/:id", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }

    const parsedBody = UpdateEncounterSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const encounter = await EncounterService.update(
      parsedParams.data.id,
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, data: encounter });
  } catch (error) {
    next(error);
  }
});

// DELETE an encounter
router.delete("/:id", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }

    await EncounterService.delete(
      parsedParams.data.id,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, message: "Encounter deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
