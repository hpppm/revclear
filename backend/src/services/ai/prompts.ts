export const buildSoapPrompt = (transcriptText: string) =>
  [
    "You are a concise clinical summarizer that converts doctor-patient conversation text into a SOAP note.",
    "Use information present in the transcript. Do not invent specific vitals or lab values.",
    "You MUST populate all four SOAP sections — never leave any section blank or empty.",
    "If a section cannot be determined from the transcript, write a brief clinical inference based on context (e.g. 'Not documented in this visit' or a reasonable clinical assumption).",
    "Transcript:",
    transcriptText,
    "Return JSON matching this exact schema:",
    '{"soap":{"subjective":"string","objective":"string","assessment":"string","plan":"string"},"confidence":0.0,"model_version":"string"}',
    "Keep sections factual and concise. All four fields are required.",
  ].join("\n");

export const buildCodeSelectionPrompt = (
  soapNote: string,
  icdCandidates: string,
  cptCandidates: string,
) => {
  const icdHint = icdCandidates.trim()
    ? `Suggested ICD-10 candidates (use as hints, not hard constraints):\n${icdCandidates}`
    : "No ICD-10 hints available — infer from clinical content.";

  const cptHint = cptCandidates.trim()
    ? `Suggested CPT candidates (use as hints, not hard constraints):\n${cptCandidates}`
    : "No CPT hints available — infer from clinical content.";

  return [
    "You are a certified medical coder.",
    "",
    "TASK: Extract and rank medical codes from the clinical note below.",
    "",
    "REQUIREMENTS:",
    "1. Always return BOTH ICD-10 diagnosis codes AND CPT procedure codes.",
    "2. If no procedures are mentioned, still generate the most likely CPT code(s) based on the visit type and assessment.",
    "3. Return up to 3 codes per type, ranked by confidence (best match first).",
    "4. Confidence must be 0-1 (0.0 to 1.0), where 1.0 = certain, 0.5 = moderate, 0.3 = speculative.",
    "5. Return ONLY valid medical codes — never invent codes.",
    "6. Always return valid JSON matching the schema, even if confidence is low.",
    "",
    "CLINICAL NOTE:",
    soapNote,
    "",
    icdHint,
    "",
    cptHint,
    "",
    "RESPOND WITH VALID JSON ONLY:",
    JSON.stringify({
      icdMatches: [
        { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Endocrine", confidence: 0.95 },
      ],
      cptMatches: [
        { code: "99213", description: "Office visit, established patient, low complexity", category: "Evaluation & Management", confidence: 0.85 },
      ],
      model_version: "gemini-2.5-flash",
    }, null, 2),
  ].join("\n");
};
