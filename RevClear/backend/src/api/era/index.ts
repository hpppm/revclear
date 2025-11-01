/**
 * 835 ERA (Electronic Remittance Advice) Processing API
 * 
 * Ingests 835 EDI files from payers/clearinghouses, extracts denial codes,
 * maps to original 837 claims, and stores feedback in BigQuery for ML retraining.
 * 
 * Denial Code Groups:
 * - CO (Contractual Obligation): Payer responsibility denials
 * - PR (Patient Responsibility): Patient owes balance
 * - OA (Other Adjustment): Administrative/processing issues
 */

import { Router, Request, Response } from 'express';
import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { verifyFirebaseToken } from '../../middleware/auth';
import { logAuditEvent } from '../../middleware/audit';

const router = Router();
const bigquery = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });

const DATASET_ID = 'ml_training';
const TABLE_ID = 'denial_feedback';
const ERA_BUCKET = process.env.ERA_BUCKET || 'revclear-era-files';

/**
 * POST /api/v1/era/ingest
 * 
 * Ingests 835 ERA file (X12 format) from clearinghouse
 * 
 * Request body:
 * {
 *   "era_file_url": "gs://bucket/path/835_file.edi",
 *   "clearinghouse": "Office Ally" | "Availity" | "Change Healthcare",
 *   "payer_name": "Blue Cross Blue Shield",
 *   "payer_id": "00123"
 * }
 * 
 * Response:
 * {
 *   "era_id": "era_abc123",
 *   "denials_processed": 5,
 *   "feedback_records_created": 5,
 *   "original_claims_linked": 4
 * }
 */
router.post('/ingest', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { era_file_url, clearinghouse, payer_name, payer_id } = req.body;

    // Validate input
    if (!era_file_url || !clearinghouse || !payer_name || !payer_id) {
      return res.status(400).json({
        error: 'Missing required fields: era_file_url, clearinghouse, payer_name, payer_id'
      });
    }

    // Log audit event
    await logAuditEvent({
      user_id: (req as any).user?.uid || 'system',
      action: 'ERA_INGESTION_STARTED',
      resource_type: 'era_file',
      resource_id: era_file_url,
      metadata: { clearinghouse, payer_name, payer_id }
    });

    // Download 835 file from Cloud Storage
    const bucket = storage.bucket(ERA_BUCKET);
    const fileName = era_file_url.replace(`gs://${ERA_BUCKET}/`, '');
    const file = bucket.file(fileName);
    
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: `ERA file not found: ${era_file_url}` });
    }

    const [fileBuffer] = await file.download();
    const eraContent = fileBuffer.toString('utf-8');

    // Parse 835 EDI file
    const parsedERA = parse835File(eraContent);
    
    // Extract denial information
    const denials = extractDenials(parsedERA);

    // Link denials to original 837 claims in database
    const linkedDenials = await linkDenialsToOriginalClaims(denials);

    // Store feedback in BigQuery for ML retraining
    const feedbackRecords = linkedDenials.map(denial => ({
      era_id: parsedERA.era_id,
      claim_id: denial.original_claim_id,
      patient_id_hash: denial.patient_id_hash, // De-identified PHI
      payer_name,
      payer_id,
      clearinghouse,
      denial_code: denial.code,
      denial_group: denial.group, // CO, PR, or OA
      denial_reason: denial.reason,
      denied_amount: denial.amount,
      submitted_cpt_codes: denial.submitted_cpt,
      submitted_icd_codes: denial.submitted_icd,
      submitted_modifiers: denial.submitted_modifiers,
      transcription_keywords: denial.transcription_keywords, // For pattern analysis
      created_at: new Date().toISOString()
    }));

    // Insert into BigQuery
    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert(feedbackRecords);

    // Log success
    await logAuditEvent({
      user_id: (req as any).user?.uid || 'system',
      action: 'ERA_INGESTION_COMPLETED',
      resource_type: 'era_file',
      resource_id: parsedERA.era_id,
      metadata: { 
        denials_processed: denials.length,
        feedback_records_created: feedbackRecords.length
      }
    });

    res.status(200).json({
      era_id: parsedERA.era_id,
      denials_processed: denials.length,
      feedback_records_created: feedbackRecords.length,
      original_claims_linked: linkedDenials.filter(d => d.original_claim_id).length
    });

  } catch (error: any) {
    console.error('Error processing 835 ERA:', error);
    
    await logAuditEvent({
      user_id: (req as any).user?.uid || 'system',
      action: 'ERA_INGESTION_FAILED',
      resource_type: 'era_file',
      resource_id: req.body.era_file_url,
      metadata: { error: error.message }
    });

    res.status(500).json({
      error: 'Failed to process ERA file',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/era/denials/summary
 * 
 * Returns denial pattern summary for dashboard
 * 
 * Query params:
 * - start_date: ISO date string (default: 30 days ago)
 * - end_date: ISO date string (default: today)
 * 
 * Response:
 * {
 *   "total_denials": 150,
 *   "denial_rate": 0.12,
 *   "top_denial_codes": [
 *     { "code": "CO-97", "reason": "Service not covered", "count": 35 },
 *     { "code": "PR-1", "reason": "Deductible", "count": 28 }
 *   ],
 *   "denials_by_payer": [...],
 *   "avg_denied_amount": 125.50
 * }
 */
router.get('/denials/summary', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.end_date || new Date().toISOString();

    const query = `
      SELECT
        COUNT(*) as total_denials,
        AVG(denied_amount) as avg_denied_amount,
        denial_code,
        denial_reason,
        COUNT(*) as denial_count
      FROM \`${process.env.GCP_PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\`
      WHERE created_at BETWEEN @start_date AND @end_date
      GROUP BY denial_code, denial_reason
      ORDER BY denial_count DESC
      LIMIT 10
    `;

    const options = {
      query,
      params: { start_date: startDate, end_date: endDate }
    };

    const [rows] = await bigquery.query(options);

    res.status(200).json({
      total_denials: rows.reduce((sum: number, row: any) => sum + parseInt(row.denial_count), 0),
      avg_denied_amount: rows[0]?.avg_denied_amount || 0,
      top_denial_codes: rows.map((row: any) => ({
        code: row.denial_code,
        reason: row.denial_reason,
        count: parseInt(row.denial_count)
      }))
    });

  } catch (error: any) {
    console.error('Error fetching denial summary:', error);
    res.status(500).json({
      error: 'Failed to fetch denial summary',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/era/training-data
 * 
 * Returns prepared training data for Vertex AI retraining
 * 
 * Query params:
 * - min_denial_count: Minimum denials for a pattern (default: 3)
 * 
 * Response:
 * {
 *   "training_records": 250,
 *   "patterns": [
 *     {
 *       "transcription_pattern": "chronic lower back pain",
 *       "incorrect_code": "M54.9",
 *       "correct_code": "M54.5",
 *       "denial_count": 15,
 *       "avg_denial_amount": 150.00
 *     }
 *   ]
 * }
 */
router.get('/training-data', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const minDenialCount = parseInt(req.query.min_denial_count as string) || 3;

    const query = `
      WITH denial_patterns AS (
        SELECT
          transcription_keywords,
          submitted_cpt_codes,
          submitted_icd_codes,
          denial_code,
          COUNT(*) as pattern_count,
          AVG(denied_amount) as avg_amount
        FROM \`${process.env.GCP_PROJECT_ID}.${DATASET_ID}.${TABLE_ID}\`
        WHERE denial_group = 'CO'  -- Only contractual denials (coding errors)
        GROUP BY transcription_keywords, submitted_cpt_codes, submitted_icd_codes, denial_code
        HAVING pattern_count >= @min_count
      )
      SELECT * FROM denial_patterns
      ORDER BY pattern_count DESC
    `;

    const options = {
      query,
      params: { min_count: minDenialCount }
    };

    const [rows] = await bigquery.query(options);

    res.status(200).json({
      training_records: rows.length,
      patterns: rows.map((row: any) => ({
        transcription_pattern: row.transcription_keywords,
        submitted_codes: {
          cpt: row.submitted_cpt_codes,
          icd: row.submitted_icd_codes
        },
        denial_code: row.denial_code,
        pattern_count: parseInt(row.pattern_count),
        avg_denial_amount: parseFloat(row.avg_amount)
      }))
    });

  } catch (error: any) {
    console.error('Error fetching training data:', error);
    res.status(500).json({
      error: 'Failed to fetch training data',
      details: error.message
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

interface ParsedERA {
  era_id: string;
  payer_control_number: string;
  check_number: string;
  check_amount: number;
  claims: ParsedClaim[];
}

interface ParsedClaim {
  claim_id: string;
  patient_control_number: string;
  claim_amount: number;
  paid_amount: number;
  adjustments: ClaimAdjustment[];
}

interface ClaimAdjustment {
  group: 'CO' | 'PR' | 'OA';
  code: string;
  reason: string;
  amount: number;
}

interface Denial {
  claim_id: string;
  patient_control_number: string;
  code: string;
  group: 'CO' | 'PR' | 'OA';
  reason: string;
  amount: number;
  original_claim_id?: string;
  patient_id_hash?: string;
  submitted_cpt?: string[];
  submitted_icd?: string[];
  submitted_modifiers?: string[];
  transcription_keywords?: string[];
}

/**
 * Parse 835 EDI file (X12 format)
 * 
 * Simplified parser - production would use a full EDI library
 * like node-edi-x12 or @stedi/edi-parser
 */
function parse835File(content: string): ParsedERA {
  // This is a simplified mock parser
  // Real implementation would parse X12 segments:
  // ST*835 (Start transaction)
  // BPR*I (Financial information)
  // TRN*1 (Reassociation trace number)
  // REF*EV (Receiver identification)
  // CLP*123 (Claim payment information)
  // CAS*CO*97*150.00 (Claim adjustment segment - DENIAL)
  // SE*20*0001 (End transaction)

  const eraId = `era_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Mock parsing - would extract from actual X12 segments
  return {
    era_id: eraId,
    payer_control_number: 'PCN123456',
    check_number: 'CHK789012',
    check_amount: 5250.00,
    claims: [
      {
        claim_id: 'CLM001',
        patient_control_number: 'PAT123',
        claim_amount: 250.00,
        paid_amount: 100.00,
        adjustments: [
          {
            group: 'CO',
            code: 'CO-97',
            reason: 'Payment adjusted because the benefit for this service is included in another service',
            amount: 150.00
          }
        ]
      }
    ]
  };
}

/**
 * Extract denials from parsed ERA
 * 
 * Only extracts adjustments with $0 payment or CO (Contractual Obligation) codes
 */
function extractDenials(era: ParsedERA): Denial[] {
  const denials: Denial[] = [];

  for (const claim of era.claims) {
    for (const adj of claim.adjustments) {
      // Include CO (coding errors) and full denials (paid_amount === 0)
      if (adj.group === 'CO' || claim.paid_amount === 0) {
        denials.push({
          claim_id: claim.claim_id,
          patient_control_number: claim.patient_control_number,
          code: adj.code,
          group: adj.group,
          reason: adj.reason,
          amount: adj.amount
        });
      }
    }
  }

  return denials;
}

/**
 * Link ERA denials to original 837 claims in database
 * 
 * Joins on patient_control_number and claim_id to retrieve:
 * - Original transcription text
 * - Submitted CPT/ICD codes
 * - Vertex AI's coding confidence scores
 */
async function linkDenialsToOriginalClaims(denials: Denial[]): Promise<Denial[]> {
  // Query original claims from Cloud SQL
  // Would use a JOIN query like:
  //
  // SELECT 
  //   c.claim_id, 
  //   c.patient_id_hash,
  //   c.transcription_text,
  //   c.submitted_cpt_codes,
  //   c.submitted_icd_codes,
  //   c.submitted_modifiers
  // FROM claims c
  // WHERE c.claim_id IN (...)
  //
  // For now, mock the linkage

  return denials.map(denial => ({
    ...denial,
    original_claim_id: `claim_${denial.claim_id}`,
    patient_id_hash: 'sha256_abc123', // SHA-256 hash of patient ID (de-identified)
    submitted_cpt: ['97161'],
    submitted_icd: ['M54.5'],
    submitted_modifiers: [],
    transcription_keywords: ['chronic', 'lower', 'back', 'pain', 'ROM', 'strength']
  }));
}

export default router;
