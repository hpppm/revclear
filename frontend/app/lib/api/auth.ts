import api from "./axios";

type AuthPayload = Record<string, unknown>;

export const authApi = {
    signup: (data: AuthPayload) => api.post("/auth/signup", data),
    confirmSignup: (data: AuthPayload) => api.post("/auth/confirm-signup", data),
    signin: (data: AuthPayload) => api.post("/auth/signin", data),
    signout: () => api.post("/auth/signout"),
    refreshToken: (refreshToken: string) => api.post("/auth/refresh-token", { refreshToken }),
    forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
    confirmForgotPassword: (data: AuthPayload) => api.post("/auth/confirm-forgot-password", data),
    me: () => api.get("/auth/me"),
};
