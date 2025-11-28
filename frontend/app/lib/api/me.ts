import api from "./axios";

export const meApi = {
    getProfile: () => api.get("/me"),
    updateProfile: (payload: Record<string, any>) => api.patch("/me", payload),
};
