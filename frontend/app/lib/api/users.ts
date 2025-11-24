import api from "./axios";

export const usersApi = {
    getAll: () => api.get("/users"),
    getByCognitoId: (cognitoId: string) => api.get(`/users/${cognitoId}`),
};
