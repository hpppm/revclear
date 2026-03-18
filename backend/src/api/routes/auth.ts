import { Router } from "express";
import { AuthService } from "../../services/authService";
import { authMiddleware } from "../../middleware/auth";
import { appConfig } from "../../config/appConfig";
import logger from "../../utils/logger";

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
  const { email, password, attributes, practitionerType, licenseId } = req.body;

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
  const { email, code } = req.body;
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
  const { email, password } = req.body;
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
        ? { debug_cognito_error: error.name, debug_message: error.message }
        : {};
    res.status(401).json({ error: "Invalid email or password.", ...devDetail });
  }
});

// Sign-out route - does NOT require auth middleware
// Users with expired tokens should still be able to clear cookies
router.post("/signout", async (req, res) => {
  try {
    // Get token from cookie or header (may be expired, that's OK)
    const accessToken =
      req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
    if (accessToken) {
      try {
        await AuthService.signout(accessToken);
      } catch {
        // Ignore errors - token may be expired/invalid
      }
    }

    // Always clear httpOnly cookies
    res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);

    res.status(200).json({ message: "Signed out successfully." });
  } catch (error: any) {
    // Even if signout fails, clear cookies and return success
    res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
    res.status(200).json({ message: "Signed out successfully." });
  }
});

// Refresh token route
router.post("/refresh-token", async (req, res) => {
  // Get refresh token from cookie or body
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
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
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
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
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res
      .status(400)
      .json({ error: "Email, code, and new password are required." });
  }
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
