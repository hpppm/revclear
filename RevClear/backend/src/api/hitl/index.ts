import { Router } from 'express';

const router = Router();

/**
 * POST /api/v1/hitl/transcription/approve
 * Medical professional approves transcription
 */
router.post('/transcription/approve', async (req, res) => {
  // TODO: Implement HITL Gate 1 approval
  // - Store approval in Cloud SQL
  // - Trigger Pub/Sub event
  // - Send feedback to ML training pipeline
  res.status(501).json({
    error: 'Not implemented',
    message: 'HITL transcription approval route stub'
  });
});

/**
 * POST /api/v1/hitl/codes/approve
 * Medical coder validates CPT/ICD codes
 */
router.post('/codes/approve', async (req, res) => {
  // TODO: Implement HITL Gate 2 approval
  // - Store code validation in Cloud SQL
  // - Send feedback to ML training
  res.status(501).json({
    error: 'Not implemented',
    message: 'HITL code validation route stub'
  });
});

/**
 * POST /api/v1/hitl/billing/approve
 * Billing specialist final approval
 */
router.post('/billing/approve', async (req, res) => {
  // TODO: Implement HITL Gate 3 approval
  // - Final compliance check
  // - Mark ready for submission
  res.status(501).json({
    error: 'Not implemented',
    message: 'HITL billing approval route stub'
  });
});

export default router;
