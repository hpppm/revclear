import api from "./axios";

export const healthApi = {
    check: () => api.get("/health"),
};
