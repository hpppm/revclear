import api from "./axios";

export const organizationsApi = {
    getCurrent: () => api.get("/organizations/me"),
    create: (payload: Record<string, any>) => api.post("/organizations", payload),
    joinWithCode: (invitationCode: string) =>
        api.post("/organizations/join", { invitationCode }),
    updateCurrent: (payload: Record<string, any>) => api.patch("/organizations/me", payload),
};
