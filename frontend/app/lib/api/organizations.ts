import api from "./axios";
import { OrganizationResponseSchema } from "../validation/schemas";
import logger from "@/app/lib/logger";

// SECURITY: Validate organization API responses to detect unexpected/sensitive data
function validateOrgResponse(data: any): void {
    try {
        const org = data?.data?.organization || data?.data?.data || data?.data || data;
        if (org && typeof org === "object" && org.id) {
            OrganizationResponseSchema.parse(org);
        }
    } catch (error) {
        logger.error("Organization response validation failed - possible data leak");
    }
}

export const organizationsApi = {
    getCurrent: async () => {
        const response = await api.get("/organizations/me");
        validateOrgResponse(response);
        return response;
    },
    create: async (payload: Record<string, any>) => {
        const response = await api.post("/organizations", payload);
        validateOrgResponse(response);
        return response;
    },
    joinWithCode: async (invitationCode: string) => {
        const response = await api.post("/organizations/join", { invitationCode });
        validateOrgResponse(response);
        return response;
    },
    updateCurrent: async (payload: Record<string, any>) => {
        const response = await api.patch("/organizations/me", payload);
        validateOrgResponse(response);
        return response;
    },
};
