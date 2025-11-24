import api from "./axios";

export const encountersApi = {
    getAll: () => api.get("/encounters"),
    getById: (id: string) => api.get(`/encounters/${id}`),
    create: (data: any) => api.post("/encounters", data),
    update: (id: string, data: any) => api.put(`/encounters/${id}`, data),
    delete: (id: string) => api.delete(`/encounters/${id}`),
};
