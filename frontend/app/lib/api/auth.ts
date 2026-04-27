import { z } from "zod";
import api from "./axios";

// SECURITY: Explicit payload types prevent callers from injecting internal
// fields (role, organization_id, is_admin) into auth requests. All write
// payloads are stripped to only the fields the backend expects.

// SECURITY: Client-side cooldown on Cognito SMS/email endpoints.
// Prevents rapid form re-submission from exhausting Cognito SMS quotas and
// triggering account lockouts. Backend rate-limiting is the authoritative
// guard; this is a defence-in-depth measure for the UI layer.
const COOLDOWN_MS = 3000;
const lastCallTimestamps: Record<string, number> = {};

function enforceCooldown(key: string): void {
  const now = Date.now();
  const last = lastCallTimestamps[key] ?? 0;
  if (now - last < COOLDOWN_MS) {
    throw new Error("Please wait a moment before trying again.");
  }
  lastCallTimestamps[key] = now;
}

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  attributes: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
  }).optional(),
  practitionerType: z.string().optional(),
  licenseId: z.string().optional(),
});

const ConfirmSignupSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ConfirmForgotPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  newPassword: z.string().min(8),
});

const VerifyMfaSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type SignupPayload = z.infer<typeof SignupSchema>;
// full_name is sent via attributes.name — not a top-level field on signup
export type ConfirmSignupPayload = z.infer<typeof ConfirmSignupSchema>;
export type SigninPayload = z.infer<typeof SigninSchema>;
export type ConfirmForgotPasswordPayload = z.infer<typeof ConfirmForgotPasswordSchema>;
export type VerifyMfaPayload = z.infer<typeof VerifyMfaSchema>;

export const authApi = {
  // Cooldown applied — each signup triggers Cognito user creation + email/SMS.
  signup: (data: SignupPayload) => {
    enforceCooldown("signup");
    return api.post("/auth/signup", SignupSchema.parse(data));
  },

  confirmSignup: (data: ConfirmSignupPayload) =>
    api.post("/auth/confirm-signup", ConfirmSignupSchema.parse(data)),

  signin: (data: SigninPayload) =>
    api.post("/auth/signin", SigninSchema.parse(data)),

  signout: () => api.post("/auth/signout"),

  // SECURITY: Refresh token is sent automatically via httpOnly cookie
  // (withCredentials: true on the axios instance). No token in body.
  refreshToken: () => api.post("/auth/refresh-token"),

  // Cooldown applied — forgotPassword triggers a Cognito SMS/email send.
  forgotPassword: (email: string) => {
    enforceCooldown("forgotPassword");
    return api.post("/auth/forgot-password", { email: z.string().email().parse(email) });
  },

  // Cooldown applied — confirmForgotPassword triggers a Cognito code verification
  // and may send follow-up SMS if the code is wrong (account lockout risk).
  confirmForgotPassword: (data: ConfirmForgotPasswordPayload) => {
    enforceCooldown("confirmForgotPassword");
    return api.post("/auth/confirm-forgot-password", ConfirmForgotPasswordSchema.parse(data));
  },

  // Cooldown applied — verifyMfa triggers Cognito challenge verification.
  verifyMfa: (data: VerifyMfaPayload) => {
    enforceCooldown("verifyMfa");
    return api.post("/auth/verify-mfa", VerifyMfaSchema.parse(data));
  },

  // Step 1 of MFA_SETUP: get the TOTP secret code to show as QR / manual key.
  associateTotp: () => api.post("/auth/associate-totp"),

  // Step 2 of MFA_SETUP: confirm the device with the first TOTP code.
  verifyTotpSetup: (data: VerifyMfaPayload) => {
    enforceCooldown("verifyTotpSetup");
    return api.post("/auth/verify-totp-setup", VerifyMfaSchema.parse(data));
  },

  resendConfirmationCode: (email: string) =>
    api.post("/auth/resend-confirmation-code", { email: z.string().email().parse(email) }),

  me: () => api.get("/auth/me"),
};
