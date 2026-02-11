import api from "./axios";

type SoapPayload = Record<string, unknown>;

export const soapApi = {
    getForEncounter: (encounterId: string) => api.get(`/encounters/${encounterId}/soap`),
    generateFromTranscript: (encounterId: string) => api.post(`/encounters/${encounterId}/soap`),
    generateFromMockTranscript: (encounterId: string) => api.post(`/encounters/${encounterId}/soap/mock`),
    update: (encounterId: string, data: SoapPayload) => api.put(`/encounters/${encounterId}/soap`, data),
};
