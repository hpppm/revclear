import api from "./axios";

export const meApi = {
    getProfile: () => api.get("/me"),
};
