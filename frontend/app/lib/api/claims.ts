import api from "./axios";

export const claimsApi = {
    getAll: () => api.get("/claims"),
    getById: (id: string) => api.get(`/claims/${id}`),
    create: (data: any) => api.post("/claims", data),
    update: (id: string, data: any) => api.put(`/claims/${id}`, data),
    delete: (id: string) => api.delete(`/claims/${id}`),
};
