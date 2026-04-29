export const buildSoapPrompt = (transcriptText: string) =>
  [
    "You are a concise clinical summarizer that converts doctor-patient conversation text into a SOAP note.",
    "Use only information present in the transcript; do not invent vitals or labs.",
    "Transcript:",
    transcriptText,
    "Return JSON matching this exact schema:",
    '{"soap":{"subjective":"string","objective":"string","assessment":"string","plan":"string"},"confidence":0.0,"model_version":"string"}',
    "Keep sections factual and concise.",
  ].join("\n");

export const buildCodeSelectionPrompt = (
  soapNote: string,
  icdCandidates: string,
  cptCandidates: string,
) => {
  const icdHint = icdCandidates.trim()
    ? `Suggested ICD-10 candidates (use as hints, not hard constraints):\n${icdCandidates}`
    : "";

  const cptHint = cptCandidates.trim()
    ? `Suggested CPT candidates (use as hints, not hard constraints):\n${cptCandidates}`
    : "";

  return [
    "You are a certified medical coder.",
    "You MUST always return BOTH ICD-10 diagnosis codes AND CPT procedure codes — never omit either type.",
    "Return up to 3 ICD-10 codes and up to 3 CPT codes based on your clinical knowledge.",
    "Rank the best matches by confidence first.",
    "SOAP NOTE:",
    soapNote,
    ...(icdHint ? [icdHint] : []),
    ...(cptHint ? [cptHint] : []),
    "Return JSON matching this exact schema:",
    '{"icdMatches":[{"code":"string","description":"string","category":"string","confidence":0}],"cptMatches":[{"code":"string","description":"string","category":"string","confidence":0}],"model_version":"string"}',
  ].join("\n");
};
