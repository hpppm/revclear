export const AI_FLOW_NAMES = {
  transcript: "whisper_transcript",
  soapNote: "soap_note",
} as const;

export const LEGACY_SOAP_FLOW_NAMES = ["soap_gemini", "soap_ollama"] as const;

export const SOAP_READ_FLOW_NAMES = [
  AI_FLOW_NAMES.soapNote,
  ...LEGACY_SOAP_FLOW_NAMES,
];
