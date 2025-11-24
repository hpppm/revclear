import { authApi } from "./auth";
import { claimsApi } from "./claims";
import { encountersApi } from "./encounters";
import { healthApi } from "./health";
import { meApi } from "./me";
import { patientsApi } from "./patients";
import { soapApi } from "./soap";
import { transcribeApi } from "./transcribe";
import { usersApi } from "./users";

export const apiClient = {
    auth: authApi,
    claims: claimsApi,
    encounters: encountersApi,
    health: healthApi,
    me: meApi,
    patients: patientsApi,
    soap: soapApi,
    transcribe: transcribeApi,
    users: usersApi,
};
