import { Router } from "express";
import {
  signUpUser,
  confirmSignUp,
  signInUser,
  adminConfirmSignUp,
  signOutUser,
  refreshAuthTokens,
  forgotPassword,
  confirmForgotPassword,
} from "../../config/awsCognito";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
const allowedEmailDomain = (process.env.TEST_EMAIL_DOMAIN || "@localhost.dev").toLowerCase();
const autoConfirmSignups = (process.env.AUTO_CONFIRM_SIGNUP ?? "true").toLowerCase() !== "false";
const autoLoginAfterSignup = (process.env.AUTO_LOGIN_AFTER_SIGNUP ?? "true").toLowerCase() !== "false";

function isAllowedEmail(email?: string) {
  if (!email) return false;
  return email.toLowerCase().endsWith(allowedEmailDomain);
}

async function buildSignupResponse(email: string, password: string, baseMessage: string) {
  const autoConfirmResult: { enabled: boolean; success?: boolean; error?: string } = {
    enabled: autoConfirmSignups,
  };
  const autoLoginResult: { enabled: boolean; success?: boolean; error?: string } = {
    enabled: autoLoginAfterSignup,
  };
  let authenticationResult: any;

  if (autoConfirmSignups) {
    try {
      await adminConfirmSignUp(email);
      autoConfirmResult.success = true;
    } catch (confirmError: any) {
      console.warn("Auto confirm failed; user must confirm manually:", confirmError);
      autoConfirmResult.success = false;
      autoConfirmResult.error =
        confirmError?.message || "Failed to auto confirm user.";
    }
  }

  if (autoLoginAfterSignup) {
    if (!autoConfirmSignups || autoConfirmResult.success !== false) {
      try {
        const loginResponse = await signInUser(email, password);
        authenticationResult = loginResponse.AuthenticationResult;
        autoLoginResult.success = true;
      } catch (loginError: any) {
        console.warn("Auto login after signup failed:", loginError);
        autoLoginResult.success = false;
        autoLoginResult.error =
          loginError?.message || "Failed to auto login user.";
      }
    } else {
      autoLoginResult.success = false;
      autoLoginResult.error = "Skipped auto login because confirmation failed.";
    }
  }

  const messages = [baseMessage];
  if (autoConfirmSignups) {
    messages.push(
      autoConfirmResult.success
        ? "Account auto-confirmed for testing."
        : "Auto confirmation failed; please confirm manually using the code from Cognito."
    );
  } else {
    messages.push(
      "Check your inbox for the verification code to confirm the account."
    );
  }
  if (autoLoginAfterSignup && autoLoginResult.success) {
    messages.push("Authentication tokens are included for immediate dashboard access.");
  } else if (autoLoginAfterSignup && autoLoginResult.error) {
    messages.push("Automatic login failed; try signing in manually.");
  }

  return {
    message: messages.join(" "),
    autoConfirm: autoConfirmResult,
    autoLogin: autoLoginResult,
    AuthenticationResult: authenticationResult,
  };
}

// Sign-up route
router.post("/signup", async (req, res) => {
  const { email, password, attributes } = req.body;
  if (!isAllowedEmail(email)) {
    return res.status(400).json({
      error: `Email must end with ${allowedEmailDomain} for testing`,
    });
  }
  try {
    const response = await signUpUser(email, password, attributes);
    const payload = await buildSignupResponse(
      email,
      password,
      "User signed up successfully."
    );
    res.status(200).json({
      ...payload,
      response,
    });
  } catch (error: any) {
    console.error("Sign-up error:", error);
    if (error.name === 'InvalidPasswordException') {
      return res.status(400).json({
        error: "Password does not meet the complexity requirements.",
        policy: "Password must be at least 8 characters long and include at least one number, one special character, one uppercase letter, and one lowercase letter.",
        details: error.message,
      });
    }
    if (error.name === 'UsernameExistsException') {
      const payload = await buildSignupResponse(
        email,
        password,
        "Account already exists — reusing sandbox credentials."
      );
      return res.status(200).json({
        ...payload,
        existingAccount: true,
      });
    }
    res.status(400).json({ error: error.message || "Failed to sign up user." });
  }
});

// Confirm sign-up route
router.post("/confirm-signup", async (req, res) => {
  const { email, code } = req.body;
  if (!isAllowedEmail(email)) {
    return res.status(400).json({
      error: `Email must end with ${allowedEmailDomain} for testing`,
    });
  }
  try {
    const response = await confirmSignUp(email, code);
    res.status(200).json({ message: "Account confirmed successfully.", response });
  } catch (error: any) {
    console.error("Confirm sign-up error:", error);
    res.status(400).json({ error: error.message || "Failed to confirm sign up." });
  }
});

// Sign-in route
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!isAllowedEmail(email)) {
    return res.status(400).json({
      error: `Email must end with ${allowedEmailDomain} for testing`,
    });
  }
  try {
    const response = await signInUser(email, password);
    // In a real application, you would typically return the tokens to the client
    res.status(200).json({
      message: "User signed in successfully.",
      AuthenticationResult: response.AuthenticationResult,
    });
  } catch (error: any) {
    console.error("Sign-in error:", error);
    if (error.name === "UserNotConfirmedException" && autoConfirmSignups) {
      try {
        await adminConfirmSignUp(email);
        const response = await signInUser(email, password);
        return res.status(200).json({
          message:
            "User was auto-confirmed and signed in successfully for testing.",
          autoConfirm: { enabled: true, success: true },
          AuthenticationResult: response.AuthenticationResult,
        });
      } catch (confirmError: any) {
        console.warn("Auto confirm during sign-in failed:", confirmError);
        return res.status(400).json({
          error: "User is not confirmed. Please verify the account via Cognito.",
          details: confirmError?.message || error.message,
          autoConfirm: { enabled: true, success: false },
        });
      }
    }
    if (error.name === 'InvalidParameterException' && error.message.includes('USER_PASSWORD_AUTH flow not enabled')) {
      return res.status(400).json({
        error: "Authentication flow not enabled.",
        details: "The USER_PASSWORD_AUTH flow is not enabled for this Cognito client. This is a configuration issue that needs to be fixed in the AWS Cognito User Pool App Client settings.",
        originalError: error.message,
      });
    }
    res.status(400).json({ error: error.message || "Failed to sign in user." });
  }
});

// Sign-out route
router.post("/signout", authMiddleware, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header is missing." });
    }
    // The token is expected to be in the format "Bearer <token>"
    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
      return res.status(401).json({ error: "Access token is missing from Authorization header." });
    }
    await signOutUser(accessToken);
    res.status(200).json({ message: "User signed out successfully." });
  } catch (error: any) {
    console.error("Sign-out error:", error);
    res.status(400).json({ error: error.message || "Failed to sign out user." });
  }
});

// Refresh token route
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required." });
  }
  try {
    const response = await refreshAuthTokens(refreshToken);
    res.status(200).json({
      message: "Tokens refreshed successfully.",
      AuthenticationResult: response.AuthenticationResult,
    });
  } catch (error: any) {
    console.error("Refresh token error:", error);
    res.status(400).json({ error: error.message || "Failed to refresh tokens." });
  }
});

// Forgot password route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  try {
    await forgotPassword(email);
    res.status(200).json({ message: "Password reset code sent successfully. Check your email." });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(400).json({ error: error.message || "Failed to initiate password reset." });
  }
});

// Confirm forgot password route
router.post("/confirm-forgot-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and newPassword are required." });
  }
  try {
    await confirmForgotPassword(email, code, newPassword);
    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error: any) {
    console.error("Confirm forgot password error:", error);
    res.status(400).json({ error: error.message || "Failed to reset password." });
  }
});

// Protected route to get current user's information
router.get("/me", authMiddleware, (req, res) => {
  // req.user will contain the decoded Cognito JWT payload
  res.status(200).json({ user: req.user, message: "User data fetched successfully." });
});

export default router;
