import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requireCapability } from "../../middleware/authorization";
import { requireOrganization } from "../../middleware/context";
import { ClaimService } from "../../services/claimService";
import { CreateClaimSchema, UpdateClaimSchema, IdParamSchema } from "../../types/zod";

const router = Router();

// GET all claims (scoped to organization)
// @query {number} limit - Max results (default 50, max 100)
// @query {number} offset - Skip results (default 0)
router.get("/", authMiddleware, requireCapability("manage_claims"), requireOrganization, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 100);
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    
    const { data: claims, total } = await ClaimService.findAll(
      req.organization!.id,
      req.user!.id,
      { limit, offset }
    );
    res.json({
      success: true,
      data: claims,
      pagination: { limit, offset, total, hasMore: offset + claims.length < total }
    });
  } catch (error) {
    next(error);
  }
});

// GET claim by ID
router.get("/:id", authMiddleware, requireCapability("manage_claims"), requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }
    const { id } = parsedParams.data;

    const claim = await ClaimService.findById(
      id,
      req.organization!.id,
      req.user!.id
    );

    if (!claim) {
      return res.status(404).json({ success: false, message: "Claim not found" });
    }
    res.json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
});

// CREATE a new claim
router.post("/", authMiddleware, requireCapability("manage_claims"), requireOrganization, async (req, res, next) => {
  try {
    const parsedBody = CreateClaimSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const claim = await ClaimService.create(
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
});

// UPDATE a claim
router.put("/:id", authMiddleware, requireCapability("manage_claims"), requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }

    const parsedBody = UpdateClaimSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ success: false, errors: parsedBody.error.errors });
    }

    const claim = await ClaimService.update(
      parsedParams.data.id,
      parsedBody.data,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
});

// DELETE a claim
router.delete("/:id", authMiddleware, requireCapability("manage_claims"), requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }

    await ClaimService.delete(
      parsedParams.data.id,
      req.organization!.id,
      req.user!.id
    );

    res.json({ success: true, message: "Claim deleted successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/claims/encounter/:encounterId/preview
 * Build a claim payload without persisting it.
 */
router.get("/encounter/:encounterId/preview", authMiddleware, requireCapability("manage_claims"), requireOrganization, async (req, res, next) => {
  try {
    const parsedParams = IdParamSchema.safeParse({ id: req.params.encounterId });
    if (!parsedParams.success) {
      return res.status(400).json({ success: false, errors: parsedParams.error.errors });
    }
    const encounterId = parsedParams.data.id;

    const payload = await ClaimService.getPreview(
      encounterId,
      req.organization!,
      req.user!
    );

    return res.json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
});

export default router;
