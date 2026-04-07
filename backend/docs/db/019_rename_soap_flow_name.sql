-- Migration 019: normalize SOAP ai_results flow label
-- Purpose: decouple flow_name from provider/model naming.
-- New canonical value: soap_note

BEGIN;

UPDATE ai_results
SET flow_name = 'soap_note'
WHERE flow_name IN ('soap_gemini', 'soap_ollama');

COMMIT;
