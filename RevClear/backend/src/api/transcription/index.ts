import { Router } from 'express';

const router = Router();

/**
 * POST /api/v1/transcription/start
 * Start Speech-to-Text transcription job
 */
router.post('/start', async (req, res) => {
  // TODO: Implement Google Speech-to-Text API
  // - Get audio file from Cloud Storage
  // - Submit to Speech-to-Text API
  // - Return job_id for polling
  res.status(501).json({
    error: 'Not implemented',
    message: 'Transcription start route stub - implement Speech-to-Text API'
  });
});

/**
 * GET /api/v1/transcription/:id
 * Get transcription job status and result
 */
router.get('/:id', async (req, res) => {
  // TODO: Poll Speech-to-Text job status
  // - Return status: processing, completed, failed
  // - Return transcription text when complete
  res.status(501).json({
    error: 'Not implemented',
    message: 'Get transcription status route stub'
  });
});

export default router;
