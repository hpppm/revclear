import api from "./axios";

type OrganizationPayload = Record<string, unknown>;

export const organizationsApi = {
    getCurrent: () => api.get("/organizations/me"),
    create: (payload: OrganizationPayload) => api.post("/organizations", payload),
    joinWithCode: (invitationCode: string) =>
        api.post("/organizations/join", { invitationCode }),
    updateCurrent: (payload: OrganizationPayload) => api.patch("/organizations/me", payload),
};
