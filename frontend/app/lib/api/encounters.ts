import api from "./axios";

type EncounterPayload = Record<string, unknown>;

export const encountersApi = {
    getAll: () => api.get("/encounters"),
    getById: (id: string) => api.get(`/encounters/${id}`),
    create: (data: EncounterPayload) => api.post("/encounters", data),
    update: (id: string, data: EncounterPayload) => api.put(`/encounters/${id}`, data),
    delete: (id: string) => api.delete(`/encounters/${id}`),
    getClaim: (id: string) => api.get(`/claims/encounter/${id}`),
    previewClaim: (id: string) => api.get(`/claims/encounter/${id}/preview`),
    generateClaim: (id: string) => api.post(`/claims`, { encounter_id: id }),
};
