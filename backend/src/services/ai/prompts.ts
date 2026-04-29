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
  const icdSection = icdCandidates.trim()
    ? [
        "ICD CANDIDATES (select only from these):",
        icdCandidates,
      ].join("\n")
    : "ICD CANDIDATES: None provided — select the most clinically appropriate ICD-10 codes from your knowledge.";

  const cptSection = cptCandidates.trim()
    ? [
        "CPT CANDIDATES (select only from these):",
        cptCandidates,
      ].join("\n")
    : "CPT CANDIDATES: None provided — select the most clinically appropriate CPT codes from your knowledge.";

  return [
    "You are a certified medical coder.",
    "Return up to 3 ICD-10 codes and up to 3 CPT codes.",
    "Rank the best matches first.",
    "SOAP NOTE:",
    soapNote,
    icdSection,
    cptSection,
    "Return JSON matching this exact schema:",
    '{"icdMatches":[{"code":"string","description":"string","category":"string","confidence":0}],"cptMatches":[{"code":"string","description":"string","category":"string","confidence":0}],"model_version":"string"}',
  ].join("\n");
};
