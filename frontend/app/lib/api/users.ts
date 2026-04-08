import { z } from "zod";
import api from "./axios";
import { isOrganizationManager } from "../auth/roles";

// SECURITY: getAll() lists all users in the organization — manager-only data.
// The caller must pass their current role. If it is not a manager role the request
// is blocked client-side before hitting the network.
// The backend enforces this authoritatively with a 403; this is defence-in-depth.

function assertManagerRole(role: string | undefined): void {
  if (!isOrganizationManager(role)) {
    throw new Error("Organization manager role required to list users.");
  }
}

export const usersApi = {
  // SECURITY: callerRole must be a valid organization manager role.
  getAll: (callerRole: string | undefined, params?: { limit?: number; offset?: number }) => {
    assertManagerRole(callerRole);
    return api.get("/users", { params });
  },

  getByCognitoId: (cognitoId: string) =>
    api.get(`/users/${encodeURIComponent(z.string().min(1).parse(cognitoId))}`),
};
