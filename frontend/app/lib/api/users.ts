import { z } from "zod";
import api from "./axios";

// SECURITY: getAll() lists all users in the organization — admin-only data.
// The caller must pass their current role. If it is not "admin" the request
// is blocked client-side before hitting the network.
// The backend enforces this authoritatively with a 403; this is defence-in-depth.

function assertAdminRole(role: string | undefined): void {
  if (role !== "admin") {
    throw new Error("Admin role required to list users.");
  }
}

export const usersApi = {
  // SECURITY: callerRole must be "admin" — call site reads from useAuthorization().
  getAll: (callerRole: string | undefined, params?: { limit?: number; offset?: number }) => {
    assertAdminRole(callerRole);
    return api.get("/users", { params });
  },

  getByCognitoId: (cognitoId: string) =>
    api.get(`/users/${encodeURIComponent(z.string().min(1).parse(cognitoId))}`),
};
