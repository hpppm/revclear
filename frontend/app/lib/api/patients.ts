import api from "./axios";

type PatientPayload = Record<string, unknown>;

export const patientsApi = {
    getAll: () => api.get("/patients"),
    getById: (id: string) => api.get(`/patients/${id}`),
    create: (data: PatientPayload) => api.post("/patients", data),
    update: (id: string, data: PatientPayload) => api.put(`/patients/${id}`, data),
    delete: (id: string) => api.delete(`/patients/${id}`),
    getSubscriber: (id: string) => api.get(`/patients/${id}/subscriber`),
    upsertSubscriber: (id: string, data: PatientPayload) => api.put(`/patients/${id}/subscriber`, data),
};
