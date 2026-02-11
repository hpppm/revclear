import api from "./axios";

type ClaimPayload = Record<string, unknown>;

export const claimsApi = {
    getAll: () => api.get("/claims"),
    getById: (id: string) => api.get(`/claims/${id}`),
    create: (data: ClaimPayload) => api.post("/claims", data),
    update: (id: string, data: ClaimPayload) => api.put(`/claims/${id}`, data),
    delete: (id: string) => api.delete(`/claims/${id}`),
};
