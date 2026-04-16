import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../../services/authService";
import { authMiddleware } from "../../middleware/auth";
import { appConfig } from "../../config/appConfig";
import logger from "../../utils/logger";

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
// In production behind revclear.gannon.edu, the reverse proxy must:
// 1) terminate TLS,
// 2) forward X-Forwarded-Proto=https,
// 3) preserve the original Host header,
// otherwise secure cookies and HTTPS enforcement will misbehave.
const CLEAR_COOKIE_OPTIONS = {
  path: "/",
  secure: COOKIE_OPTIONS.secure,
  sameSite: COOKIE_OPTIONS.sameSite,
};

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches Cognito refresh token validity
};

// Sign-up route
router.post("/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  const { email, password, attributes, practitionerType, licenseId } = parsed.data;

  try {
    const result = await AuthService.signup(
      email,
      password,
      attributes,
      practitionerType,
      licenseId,
    );

    // If Cognito auto-confirmed the user and returned tokens, set httpOnly cookies
    // exactly like signin does — never expose raw tokens in the response body.
    const authResult = result?.AuthenticationResult;
    if (authResult?.AccessToken) {
      res.cookie("accessToken", authResult.AccessToken, COOKIE_OPTIONS);
    }
    if (authResult?.RefreshToken) {
      res.cookie("refreshToken", authResult.RefreshToken, REFRESH_COOKIE_OPTIONS);
    }

    res.status(200).json({
      message: "Account created successfully.",
      autoLoggedIn: !!(authResult?.AccessToken),
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
    const authResult = response.AuthenticationResult;

    // Set httpOnly cookies for secure token storage
    if (authResult?.AccessToken) {
      res.cookie("accessToken", authResult.AccessToken, COOKIE_OPTIONS);
    }
    if (authResult?.RefreshToken) {
      res.cookie(
        "refreshToken",
        authResult.RefreshToken,
        REFRESH_COOKIE_OPTIONS,
      );
    }

    // Tokens are already set in httpOnly cookies above.
    // NEVER return raw tokens in the response body — the frontend can
    // base64-decode any JWT to read all Cognito claims (sub, username, device_key, etc).
    const autoLoggedIn = !!(authResult?.AccessToken);

    res.status(200).json({
      message: "User signed in successfully.",
      autoLoggedIn,
    });
  } catch (error: any) {
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

// Sign-out route - does NOT require auth middleware
// Users with expired tokens should still be able to clear cookies
router.post("/signout", async (req, res) => {
  // Always clear httpOnly cookies first so the response is fast.
  // GlobalSignOut (Cognito) invalidates all devices and can take several seconds —
  // fire it with a 5-second timeout and let it fail silently if it's slow or the
  // token is already expired. The cookie clear is the security-critical action.
  res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
  res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);

  const accessToken = req.cookies?.accessToken;
  if (accessToken) {
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error("signout timeout")), 5000),
    );
    Promise.race([AuthService.signout(accessToken), timeout]).catch(() => {
      // Token may be expired or Cognito may be slow — cookies already cleared
    });
  }

  res.status(200).json({ message: "Signed out successfully." });
});

// Refresh token route
router.post("/refresh-token", async (req, res) => {
  // Read refresh token from httpOnly cookie only — never from the request body.
  // Accepting it via req.body would allow scripts (which cannot read httpOnly
  // cookies) to inject an arbitrary token, defeating the cookie-only transport.
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }
  try {
    const response = await AuthService.refreshToken(refreshToken);
    const authResult = response.AuthenticationResult;

    // Set new access token cookie
    if (authResult?.AccessToken) {
      res.cookie("accessToken", authResult.AccessToken, COOKIE_OPTIONS);
    }

    // Do NOT return raw tokens in the body — cookie is the only token transport.
    res.status(200).json({
      message: "Tokens refreshed successfully.",
    });
  } catch (error: any) {
    // Clear cookies on refresh failure
    res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
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
