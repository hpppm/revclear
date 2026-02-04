import api from "./axios";

export const encountersApi = {
    getAll: () => api.get("/encounters"),
    getAllByPatient: (patientId: string) => api.get(`/encounters?patient_id=${patientId}`),
    getById: (id: string) => api.get(`/encounters/${id}`),
    create: (data: any) => api.post("/encounters", data),
    update: (id: string, data: any) => api.put(`/encounters/${id}`, data),
    delete: (id: string) => api.delete(`/encounters/${id}`),
    getClaim: (id: string) => api.get(`/claims/encounter/${id}`),
    previewClaim: (id: string) => api.get(`/claims/encounter/${id}/preview`),
    generateClaim: (id: string) => api.post(`/claims`, { encounter_id: id }),
};
