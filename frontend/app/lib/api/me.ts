import api from "./axios";

type ProfilePayload = Record<string, unknown>;

export const meApi = {
    getProfile: () => api.get("/me"),
    updateProfile: (payload: ProfilePayload) => api.patch("/me", payload),
};
