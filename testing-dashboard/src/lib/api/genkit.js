import { apiClient } from "./apiClient";

/**
 * Genkit API helpers.
 * NOTE: The backend route is not yet wired; this will be hooked up once /dev/genkit endpoints exist.
 */
export const genkit = {
  runSpeechToSoap: (payload) => {
    const config = {
      method: "POST",
      body: JSON.stringify(payload),
    };
    // Placeholder endpoint; implement in backend under /api/dev/*.
    return apiClient("/dev/genkit/speech-to-soap", config);
  },
};
