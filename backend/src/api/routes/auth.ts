import { Router } from "express";
import { z } from "zod";
import { createHmac, timingSafeEqual, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { AuthService } from "../../services/authService";
import { refreshAuthTokensWithRotation } from "../../config/awsCognito";
import { authMiddleware } from "../../middleware/auth";
import { appConfig } from "../../config/appConfig";
import { upsertActiveSession, deleteActiveSession, deleteAllSessionsForUser, countRecentOtpCodes, setEmailVerified, upsertUserEmailVerified } from "../../db/queries";
import { findUserByEmail } from "../../config/db";
import { generateOTP, saveOTP, verifyOTP } from "../../utils/otp";
import { sendOTPEmail } from "../../utils/sendOTP";
import logger from "../../utils/logger";

const SESSION_START_COOKIE = "sessionStart";

// Encrypt/decrypt a short string (e.g. password) for temporary httpOnly cookie storage.
// Uses AES-256-GCM with a key derived from the session secret.
function encryptForCookie(plaintext: string): string {
  const keyBuf = Buffer.from(
    createHmac("sha256", appConfig.session.secret).update("otp-creds-v1").digest("hex"),
    "hex",
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function decryptFromCookie(ciphertext: string): string | null {
  try {
    const buf = Buffer.from(ciphertext, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const keyBuf = Buffer.from(
      createHmac("sha256", appConfig.session.secret).update("otp-creds-v1").digest("hex"),
      "hex",
    );
    const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final("utf8");
  } catch {
    return null;
  }
}

function signSessionStart(ts: number): string {
  const mac = createHmac("sha256", appConfig.session.secret)
    .update(String(ts))
    .digest("hex");
  return `${ts}.${mac}`;
}

function verifySessionStart(value: string): number | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const ts = Number(value.slice(0, dot));
  const mac = value.slice(dot + 1);
  if (!Number.isFinite(ts)) return null;
  const expected = createHmac("sha256", appConfig.session.secret)
    .update(String(ts))
    .digest("hex");
  const safe = timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"));
  return safe ? ts : null;
}

const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  // Strict whitelist — only `name` is needed at signup.
  // An open z.record() would let attackers inject Cognito attributes such as
  // custom:tenant_id, preferred_username, etc. Tenant assignment must happen
  // server-side after signup, never from client-supplied input.
  attributes: z.object({
    name: z.string().min(1).max(100).optional(),
  }).strict().optional(),
  practitionerType: z.string().max(100).optional(),
  licenseId: z.string().max(100).optional(),
});

const ConfirmSignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().regex(/^\d{6}$/, "Confirmation code must be 6 digits"),
});

const SigninSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const ConfirmForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().regex(/^\d{6}$/, "Reset code must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
});

const VerifyMfaSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

const router = Router();

// Cookie configuration for JWT tokens
// Use 'lax' for development (different ports = different origins)
// Use 'strict' in production when frontend/backend share same origin
const cookieSameSite: "strict" | "lax" =
  appConfig.env === "production" ? "strict" : "lax";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: appConfig.env === "production", // Requires TLS termination and correct X-Forwarded-Proto from proxy
  sameSite: cookieSameSite,
  path: "/",
  maxAge: 60 * 60 * 1000, // 1 hour (matches Cognito access token expiry)
};

// Use the same cookie attributes on clear as on set.
// In production behind revclear.tech / api.revclear.tech, the reverse proxy must:
// 1) terminate TLS,
// 2) forward X-Forwarded-Proto=https,
// 3) preserve the original Host header,
// otherwise secure cookies and HTTPS enforcement will misbehave.
const CLEAR_COOKIE_OPTIONS = {
  path: "/",
  secure: COOKIE_OPTIONS.secure,
  sameSite: COOKIE_OPTIONS.sameSite,
};

// Short-lived session cookie to carry the Cognito Session token between
// the MFA challenge step and the verify-mfa response step.
// httpOnly prevents XSS from reading it; 5 min matches Cognito challenge TTL.
const MFA_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_OPTIONS.secure,
  sameSite: cookieSameSite,
  path: "/",
  maxAge: 5 * 60 * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches Cognito refresh token validity
};

// Signed cookie tracking absolute session start time for 8h HIPAA timeout.
// maxAge matches refresh token so it outlives the access token.
const SESSION_START_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_OPTIONS.secure,
  sameSite: cookieSameSite,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Server-issued marker that this browser session completed MFA challenge
// via /verify-mfa or /verify-totp-setup. Used as a fallback when Cognito
// access tokens omit/reshape amr claims.
const MFA_VERIFIED_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 60 * 60 * 1000, // 1 hour — matches Cognito access token lifetime
};

// Short-lived cookie carrying the pending OTP email so verify-otp and resend-otp
// can look it up without trusting user-supplied body params.
const OTP_PENDING_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_OPTIONS.secure,
  sameSite: cookieSameSite,
  path: "/",
  maxAge: 10 * 60 * 1000, // 10 minutes — matches OTP expiry
};

// Helper: sets all auth cookies and registers the active session after a successful login.
async function establishSession(
  res: import("express").Response,
  accessToken: string,
  refreshToken: string | undefined,
  userId: string,
  jti: string,
): Promise<void> {
  res.cookie("accessToken", accessToken, COOKIE_OPTIONS);
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
  }
  res.cookie(SESSION_START_COOKIE, signSessionStart(Date.now()), SESSION_START_COOKIE_OPTIONS);
  await upsertActiveSession(userId, jti);
}

// Helper: clears all auth-related cookies.
function clearAllAuthCookies(res: import("express").Response): void {
  res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
  res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
  res.clearCookie("mfaVerified", CLEAR_COOKIE_OPTIONS);
  res.clearCookie("mfaSession", CLEAR_COOKIE_OPTIONS);
  res.clearCookie(SESSION_START_COOKIE, CLEAR_COOKIE_OPTIONS);
}

// Sign-up route
// Cognito auto-confirms accounts in this pool, so we gate on our own OTP email
// to verify the user owns the address before issuing any session.
router.post("/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, password, attributes, practitionerType, licenseId } = parsed.data;

  try {
    await AuthService.signup(
      email,
      password,
      attributes,
      practitionerType,
      licenseId,
    );

    // Account created — send OTP for email verification.
    // Tokens are not issued until OTP is verified, then TOTP is set up.
    const otp = generateOTP();
    await saveOTP(email, otp);
    await sendOTPEmail(email, otp);

    res.cookie("otpPending", email, OTP_PENDING_COOKIE_OPTIONS);
    res.cookie("otpNextStep", "MFA_SETUP", OTP_PENDING_COOKIE_OPTIONS);
    res.cookie("otpPendingCreds", encryptForCookie(password), OTP_PENDING_COOKIE_OPTIONS);

    return res.status(200).json({
      message: "Account created successfully.",
      step: "verify-otp",
      email,
    });
  } catch (error: any) {
    // Log internally but don't expose details
    if (error.name === "InvalidPasswordException") {
      return res.status(400).json({
        error: "Password does not meet the complexity requirements.",
        policy:
          "Password must be at least 8 characters long and include at least one number, one special character, one uppercase letter, and one lowercase letter.",
      });
    }
    if (error.name === "UsernameExistsException") {
      return res.status(400).json({
        error: "An account with this email already exists.",
        message:
          "Please use the login page to sign in, or use a different email address.",
      });
    }
    res.status(400).json({ error: "Failed to sign up. Please try again." });
  }
});

// Confirm sign-up route
router.post("/confirm-signup", async (req, res) => {
  const parsed = ConfirmSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, code } = parsed.data;
  try {
    await AuthService.confirmSignup(email, code);
    res.status(200).json({ message: "Account confirmed successfully." });
  } catch (error: any) {
    // Don't reveal if email exists or code is wrong
    res.status(400).json({ error: "Invalid or expired confirmation code." });
  }
});

// Sign-in route
router.post("/signin", async (req, res) => {
  const parsed = SigninSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, password } = parsed.data;
  try {
    const response = await AuthService.signin(email, password);

    // Block unverified users — check after Cognito password verification so we
    // don't leak whether an account exists to unauthenticated callers.
    const existingUser = await findUserByEmail(email);
    if (!existingUser || !existingUser.email_verified) {
      const otp = generateOTP();
      await saveOTP(email, otp);
      await sendOTPEmail(email, otp);
      res.cookie("otpPending", email, OTP_PENDING_COOKIE_OPTIONS);
      // Signin unverified path has no stashed Cognito session — the MFA_SETUP
      // challenge must be re-triggered after the user completes confirm-email.
      // Store the Cognito session if available so verify-otp can continue.
      if (response.Session) {
        res.cookie("mfaSession", response.Session, MFA_SESSION_COOKIE_OPTIONS);
      }
      return res.status(401).json({
        error: "Email not verified",
        step: "confirm-email",
        email,
      });
    }

    // MFA challenge — store Session in httpOnly cookie so the frontend can
    // complete via /verify-mfa (SOFTWARE_TOKEN_MFA) or /associate-totp (MFA_SETUP).
    if (
      response.ChallengeName === 'SOFTWARE_TOKEN_MFA' ||
      response.ChallengeName === 'MFA_SETUP'
    ) {
      // Prevent stale authenticated cookies from a previous session from
      // coexisting with a fresh MFA challenge.
      res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
      res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
      res.clearCookie("mfaVerified", CLEAR_COOKIE_OPTIONS);
      res.cookie("mfaSession", response.Session!, MFA_SESSION_COOKIE_OPTIONS);
      return res.status(200).json({
        mfaRequired: true,
        challengeName: response.ChallengeName,
        email,
      });
    }

    const authResult = response.AuthenticationResult;

    if (!authResult?.AccessToken) {
      logger.warn(
        { challengeName: response.ChallengeName, email },
        "auth/signin returned no supported challenge and no access token",
      );
      return res.status(401).json({
        error: "Sign-in incomplete. Please sign in again.",
      });
    }

    const [, payloadB64] = authResult.AccessToken.split(".");
    const tokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    await establishSession(res, authResult.AccessToken, authResult.RefreshToken, tokenPayload.sub, tokenPayload.jti);

    res.status(200).json({
      message: "User signed in successfully.",
      autoLoggedIn: true,
    });
  } catch (error: any) {
    // Ensure a failed sign-in does not leave stale auth/mfa cookies in place.
    clearAllAuthCookies(res);

    // Log the actual Cognito error server-side (never sent to client)
    logger.warn(
      { cognito_error: error.name, message: error.message, email },
      "auth/signin failed",
    );

    // Don't reveal whether email exists - use generic message
    if (error.name === "UserNotConfirmedException") {
      return res.status(400).json({
        error:
          "Account not confirmed. Please check your email for verification.",
      });
    }
    // Generic error for all other cases (wrong password, user not found, etc.)
    // In development, surface the Cognito error name to aid debugging
    const devDetail =
      appConfig.env !== "production"
        ? { cognito_error: error.name }
        : {};
    res.status(401).json({ error: "Invalid email or password.", ...devDetail });
  }
});

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

// Verify OTP — second factor before TOTP/MFA or before issuing tokens directly.
router.post("/verify-otp", async (req, res) => {
  const parsed = VerifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, code } = parsed.data;

  // Verify the email matches the pending cookie so the body cannot be
  // spoofed to verify another user's OTP.
  const pendingEmail = req.cookies?.otpPending;
  if (!pendingEmail || pendingEmail !== email) {
    return res.status(401).json({ error: "OTP session expired. Please sign in again." });
  }

  const valid = await verifyOTP(email, code);
  if (!valid) {
    return res.status(400).json({ error: "Invalid or expired code." });
  }

  const nextStep: string = req.cookies?.otpNextStep ?? "AUTHENTICATED";

  res.clearCookie("otpPending", CLEAR_COOKIE_OPTIONS);
  res.clearCookie("otpNextStep", CLEAR_COOKIE_OPTIONS);

  // Signup path — auto-signin to trigger MFA_SETUP challenge, then hand off to TOTP setup.
  if (nextStep === "MFA_SETUP") {
    const encryptedCreds = req.cookies?.otpPendingCreds;
    res.clearCookie("otpPendingCreds", CLEAR_COOKIE_OPTIONS);
    const password = encryptedCreds ? decryptFromCookie(encryptedCreds) : null;
    if (!password) {
      return res.status(401).json({ error: "OTP session expired. Please sign in again." });
    }
    try {
      const signinResponse = await AuthService.signin(email, password);
      if (signinResponse.ChallengeName !== "MFA_SETUP" && signinResponse.ChallengeName !== "SOFTWARE_TOKEN_MFA") {
        logger.warn({ email, challengeName: signinResponse.ChallengeName }, "verify-otp/MFA_SETUP: unexpected challenge after signup signin");
        return res.status(401).json({ error: "Unexpected authentication state. Please sign in again." });
      }

      // Mark email as verified — derive cognito_id from the challenge session
      // metadata. Cognito doesn't return an access token at challenge stage, so
      // we use the ChallengeParameters.USER_ID_FOR_SRP if present, otherwise
      // fall back to upsert by email only (setEmailVerified).
      try {
        const cognitoSub = (signinResponse as any).ChallengeParameters?.USER_ID_FOR_SRP as string | undefined;
        if (cognitoSub) {
          await upsertUserEmailVerified(email, cognitoSub);
        } else {
          await setEmailVerified(email);
        }
      } catch (verifyErr) {
        logger.warn({ email }, "verify-otp: failed to set email_verified — continuing");
      }

      res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
      res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
      res.clearCookie("mfaVerified", CLEAR_COOKIE_OPTIONS);
      res.cookie("mfaSession", signinResponse.Session!, MFA_SESSION_COOKIE_OPTIONS);
      return res.status(200).json({
        message: "OTP verified",
        step: "verify-mfa",
        challengeName: signinResponse.ChallengeName,
        email,
      });
    } catch (err: any) {
      logger.warn({ cognito_error: err.name, email }, "verify-otp: auto-signin after signup failed");
      return res.status(401).json({ error: "Could not complete setup. Please sign in again." });
    }
  }

  // MFA path (signin with existing TOTP) — mfaSession already set by signin route.
  return res.status(200).json({ message: "OTP verified", step: "verify-mfa", challengeName: nextStep });
});

const ResendOtpSchema = z.object({
  email: z.string().email(),
});

// Resend OTP — rate-limited to 3 attempts per 10-minute window.
router.post("/resend-otp", async (req, res) => {
  const parsed = ResendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email } = parsed.data;

  const pendingEmail = req.cookies?.otpPending;
  if (!pendingEmail || pendingEmail !== email) {
    return res.status(401).json({ error: "OTP session expired. Please sign in again." });
  }

  const recentCount = await countRecentOtpCodes(email);
  if (recentCount >= 3) {
    return res.status(429).json({ error: "Too many requests. Please wait before requesting a new code." });
  }

  const otp = generateOTP();
  await saveOTP(email, otp);
  await sendOTPEmail(email, otp);

  // Refresh the pending cookie TTL.
  res.cookie("otpPending", email, OTP_PENDING_COOKIE_OPTIONS);

  return res.status(200).json({ message: "OTP sent" });
});

// Sign-out route - does NOT require auth middleware
// Users with expired tokens should still be able to clear cookies
router.post("/signout", async (req, res) => {
  // Always clear httpOnly cookies first so the response is fast.
  // GlobalSignOut (Cognito) invalidates all devices and can take several seconds —
  // fire it with a 5-second timeout and let it fail silently if it's slow or the
  // token is already expired. The cookie clear is the security-critical action.
  clearAllAuthCookies(res);

  const accessToken = req.cookies?.accessToken;
  if (accessToken) {
    try {
      const [, payloadB64So] = accessToken.split(".");
      const { jti: soJti, sub: soSub } = JSON.parse(Buffer.from(payloadB64So, "base64url").toString());
      if (soJti) await deleteActiveSession(soJti);
      else if (soSub) await deleteAllSessionsForUser(soSub);
    } catch { /* token malformed — cookies already cleared */ }

    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("signout timeout")), 5000),
    );
    Promise.race([AuthService.signout(accessToken), timeout]).catch(() => {});
  }

  res.status(200).json({ message: "Signed out successfully." });
});

// Verify MFA code (SOFTWARE_TOKEN_MFA challenge) — user submits TOTP code from authenticator app
router.post("/verify-mfa", async (req, res) => {
  const parsed = VerifyMfaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, code } = parsed.data;

  const session = req.cookies?.mfaSession;
  if (!session) {
    return res.status(401).json({ error: "MFA session expired. Please sign in again." });
  }

  try {
    const response = await AuthService.respondToMfaChallenge(email, session, code);
    const authResult = response.AuthenticationResult;

    if (!authResult?.AccessToken) {
      logger.warn({ email }, "auth/verify-mfa missing AuthenticationResult.AccessToken");
      return res.status(401).json({ error: "MFA challenge incomplete. Please sign in again." });
    }

    res.clearCookie("mfaSession", CLEAR_COOKIE_OPTIONS);

    const [, payloadB64Mfa] = authResult.AccessToken.split(".");
    const tokenPayloadMfa = JSON.parse(Buffer.from(payloadB64Mfa, "base64url").toString());
    await establishSession(res, authResult.AccessToken, authResult.RefreshToken, tokenPayloadMfa.sub, tokenPayloadMfa.jti);
    res.cookie("mfaVerified", "true", MFA_VERIFIED_COOKIE_OPTIONS);

    res.status(200).json({ message: "MFA verified successfully.", autoLoggedIn: true });
  } catch (error: any) {
    logger.warn({ cognito_error: error.name, email }, "auth/verify-mfa failed");
    res.status(401).json({ error: "Invalid or expired verification code." });
  }
});

// Associate TOTP device — step 1 of MFA_SETUP challenge flow.
// Reads the mfaSession cookie set during signin, returns the base32 SecretCode
// the frontend uses to render the QR code / manual entry key.
router.post("/associate-totp", async (req, res) => {
  const session = req.cookies?.mfaSession;
  if (!session) {
    return res.status(401).json({ error: "MFA session expired. Please sign in again." });
  }

  try {
    const response = await AuthService.associateTotp({ session });
    // Update mfaSession cookie with the new Session returned by Cognito
    if (response.Session) {
      res.cookie("mfaSession", response.Session, MFA_SESSION_COOKIE_OPTIONS);
      logger.debug(
        { session_prefix: response.Session.slice(0, 8) },
        "auth/associate-totp: mfaSession cookie updated with refreshed session",
      );
    } else {
      logger.warn("auth/associate-totp: Cognito did not return a new Session — mfaSession cookie NOT refreshed");
    }
    // SecretCode is the base32 TOTP secret the user scans into their authenticator app.
    res.status(200).json({ secretCode: response.SecretCode });
  } catch (error: any) {
    logger.warn({ cognito_error: error.name }, "auth/associate-totp failed");
    res.status(400).json({ error: "Failed to associate authenticator app. Please sign in again." });
  }
});

// Verify TOTP setup — step 2 of MFA_SETUP challenge flow.
// User enters the 6-digit code from their authenticator app to confirm the device.
const VerifyTotpSetupSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

router.post("/verify-totp-setup", async (req, res) => {
  const parsed = VerifyTotpSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, code } = parsed.data;

  const session = req.cookies?.mfaSession;
  if (!session) {
    return res.status(401).json({ error: "MFA session expired. Please sign in again." });
  }

  try {
    logger.debug(
      { session_prefix: session.slice(0, 8) },
      "auth/verify-totp-setup: reading mfaSession cookie before verifySoftwareToken",
    );

    const verifyResponse = await AuthService.verifyTotpSetup({ session }, code);

    if (verifyResponse.Status !== "SUCCESS") {
      return res.status(401).json({ error: "Invalid verification code." });
    }

    if (!verifyResponse.Session) {
      logger.warn({ email }, "auth/verify-totp-setup: VerifySoftwareToken returned SUCCESS but no Session — cannot complete MFA setup");
      return res.status(401).json({ error: "MFA setup incomplete. Please sign in again." });
    }

    logger.debug(
      { session_prefix: verifyResponse.Session.slice(0, 8) },
      "auth/verify-totp-setup: VerifySoftwareToken SUCCESS, calling completeMfaSetup with post-verify session",
    );

    // Exchange the post-verify Session for authentication tokens.
    const authResponse = await AuthService.completeMfaSetup(email, verifyResponse.Session);
    const authResult = authResponse.AuthenticationResult;

    if (!authResult?.AccessToken) {
      logger.warn({ email }, "auth/verify-totp-setup missing AuthenticationResult.AccessToken");
      return res.status(401).json({ error: "MFA setup incomplete. Please sign in again." });
    }

    res.clearCookie("mfaSession", CLEAR_COOKIE_OPTIONS);

    const [, payloadB64Totp] = authResult.AccessToken.split(".");
    const tokenPayloadTotp = JSON.parse(Buffer.from(payloadB64Totp, "base64url").toString());
    await establishSession(res, authResult.AccessToken, authResult.RefreshToken, tokenPayloadTotp.sub, tokenPayloadTotp.jti);
    res.cookie("mfaVerified", "true", MFA_VERIFIED_COOKIE_OPTIONS);

    res.status(200).json({ message: "Authenticator app linked successfully.", autoLoggedIn: true });
  } catch (error: any) {
    logger.warn({ cognito_error: error.name, email }, "auth/verify-totp-setup failed");
    res.status(401).json({ error: "Invalid or expired verification code." });
  }
});

// Refresh token route
router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }

  // Enforce absolute 8h session timeout — reject refresh if session is too old.
  const sessionStartRaw = req.cookies?.[SESSION_START_COOKIE];
  if (sessionStartRaw) {
    const loginTime = verifySessionStart(sessionStartRaw);
    if (!loginTime || Date.now() - loginTime > appConfig.session.maxAgeMs) {
      clearAllAuthCookies(res);
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
  }

  try {
    const response = await refreshAuthTokensWithRotation(refreshToken);
    const authResult = response.AuthenticationResult;

    if (!authResult?.AccessToken) {
      clearAllAuthCookies(res);
      return res.status(401).json({ error: "Session expired", code: "REFRESH_FAILED" });
    }

    res.cookie("accessToken", authResult.AccessToken, COOKIE_OPTIONS);
    if (authResult.IdToken) {
      res.cookie("idToken", authResult.IdToken, COOKIE_OPTIONS);
    }
    // Rotate refresh token cookie — old token is now invalidated by Cognito.
    if (authResult.RefreshToken) {
      res.cookie("refreshToken", authResult.RefreshToken, REFRESH_COOKIE_OPTIONS);
    }

    res.status(200).json({ message: "Tokens refreshed successfully." });
  } catch (error: any) {
    clearAllAuthCookies(res);
    res.status(401).json({ error: "Invalid or expired refresh token." });
  }
});

// Forgot password route
router.post("/forgot-password", async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email } = parsed.data;
  try {
    await AuthService.forgotPassword(email);
  } catch (error: any) {
    // Silently fail - don't reveal if email exists
  }
  // Always return success to prevent email enumeration
  res.status(200).json({
    message: "If an account exists, a password reset code has been sent.",
  });
});

// Confirm forgot password route
router.post("/confirm-forgot-password", async (req, res) => {
  const parsed = ConfirmForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, code, newPassword } = parsed.data;
  try {
    await AuthService.confirmForgotPassword(email, code, newPassword);
    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error: any) {
    res.status(400).json({
      error:
        "Invalid or expired reset code, or password does not meet requirements.",
    });
  }
});

// Returns the authenticated DB user profile (not raw JWT claims).
// req.user is populated by authMiddleware from the database, not from the token.
router.get("/me", authMiddleware, (req, res) => {
  res
    .status(200)
    .json({ user: req.user, message: "User data fetched successfully." });
});

export default router;
