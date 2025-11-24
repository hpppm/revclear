import api from "./axios";

export const authApi = {
    signup: (data: any) => api.post("/auth/signup", data),
    confirmSignup: (data: any) => api.post("/auth/confirm-signup", data),
    signin: (data: any) => api.post("/auth/signin", data),
    signout: () => api.post("/auth/signout"),
    refreshToken: (refreshToken: string) => api.post("/auth/refresh-token", { refreshToken }),
    forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
    confirmForgotPassword: (data: any) => api.post("/auth/confirm-forgot-password", data),
    me: () => api.get("/auth/me"),
};
