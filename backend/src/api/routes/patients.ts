import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireOrganization } from "../../middleware/context";
import { PatientService } from "../../services/patientService";
import { CreatePatientSchema, UpdatePatientSchema, IdParamSchema, UpsertSubscriberSchema } from "../../types/zod";

const router = Router();

// GET all patients for the authenticated clinician (scoped to organization)
// @query {number} limit - Max results (default 50, max 100)
// @query {number} offset - Skip results (default 0)
router.get("/", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    
    const { data: patients, total } = await PatientService.findAll(
      req.organization!.id,
      req.user!.id,
      { limit, offset }
    );
    res.json({
      success: true,
      data: patients,
      pagination: { limit, offset, total, hasMore: offset + patients.length < total }
    });
  } catch (error) {
    next(error);
  }
});

// Upsert subscriber for a patient (one per patient)
router.put("/:id/subscriber", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }
    const patientId = parsedParams.data.id;

    const parsedBody = UpsertSubscriberSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const subscriber = await PatientService.upsertSubscriber(
      patientId,
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, data: subscriber });
  } catch (error) {
    next(error);
  }
});

// Get subscriber for a patient
router.get("/:id/subscriber", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }
    const patientId = parsedParams.data.id;

    const subscriber = await PatientService.getSubscriber(
      patientId,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, data: subscriber });
  } catch (error) {
    next(error);
  }
});

// GET patient by ID (only if owned by authenticated clinician/org)
router.get("/:id", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }
    const { id } = parsedParams.data;

    const patient = await PatientService.findById(
      id,
      req.organization!.id,
      req.user!.id
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

// CREATE a new patient
router.post("/", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedBody = CreatePatientSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const patient = await PatientService.create(
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

// UPDATE a patient
router.put("/:id", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }

    const parsedBody = UpdatePatientSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const patient = await PatientService.update(
      parsedParams.data.id,
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

// DELETE a patient
router.delete("/:id", authMiddleware, requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }

    await PatientService.delete(
      parsedParams.data.id,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, message: "Patient deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
