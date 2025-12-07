import { Router } from "express";
import { AuthService } from "../../services/authService";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

// Sign-up route
router.post("/signup", async (req, res) => {
  const { email, password, attributes, practitionerType, licenseId } = req.body;

  try {
    const result = await AuthService.signup(email, password, attributes, practitionerType, licenseId);
    res.status(200).json(result);
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
      return res.status(400).json({
        error: "An account with this email already exists.",
        message: "Please use the login page to sign in, or use a different email address.",
        code: "USER_ALREADY_EXISTS"
      });
    }
    res.status(400).json({ error: error.message || "Failed to sign up user." });
  }
});

// Confirm sign-up route
router.post("/confirm-signup", async (req, res) => {
  const { email, code } = req.body;
  try {
    const response = await AuthService.confirmSignup(email, code);
    res.status(200).json({ message: "Account confirmed successfully.", response });
  } catch (error: any) {
    console.error("Confirm sign-up error:", error);
    res.status(400).json({ error: error.message || "Failed to confirm sign up." });
  }
});

// Sign-in route
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const response = await AuthService.signin(email, password);

    // Check if auto-confirmation happened (internal flag)
    if ((response as any)._autoConfirmed) {
      return res.status(200).json({
        message: "User was auto-confirmed and signed in successfully for testing.",
        autoConfirm: { enabled: true, success: true },
        AuthenticationResult: response.AuthenticationResult,
      });
    }

    res.status(200).json({
      message: "User signed in successfully.",
      AuthenticationResult: response.AuthenticationResult,
    });
  } catch (error: any) {
    console.error("Sign-in error:", error);
    if (error.name === 'InvalidParameterException' && error.message.includes('USER_PASSWORD_AUTH flow not enabled')) {
      return res.status(400).json({
        error: "Authentication flow not enabled.",
        details: "The USER_PASSWORD_AUTH flow is not enabled for this Cognito client. This is a configuration issue that needs to be fixed in the AWS Cognito User Pool App Client settings.",
        originalError: error.message,
      });
    }
    // Handle auto-confirm failure specifically if needed, but AuthService throws if it fails
    if (error.name === "UserNotConfirmedException") {
      return res.status(400).json({
        error: "User is not confirmed. Please verify the account via Cognito.",
        details: error.message,
        autoConfirm: { enabled: true, success: false },
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
    const accessToken = authHeader.split(" ")[1];
    if (!accessToken) {
      return res.status(401).json({ error: "Access token is missing from Authorization header." });
    }
    await AuthService.signout(accessToken);
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
    const response = await AuthService.refreshToken(refreshToken);
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
    await AuthService.forgotPassword(email);
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
    await AuthService.confirmForgotPassword(email, code, newPassword);
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
