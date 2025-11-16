import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const region = process.env.AWS_REGION || "us-east-1";
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID || "";
const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
const allowedEmailDomain = (process.env.TEST_EMAIL_DOMAIN || "@localhost.dev").toLowerCase();
const autoConfirmSignups =
  (process.env.AUTO_CONFIRM_SIGNUP ?? "true").toLowerCase() !== "false";
const autoLoginAfterSignup =
  (process.env.AUTO_LOGIN_AFTER_SIGNUP ?? "true").toLowerCase() !== "false";

const cognito = new CognitoIdentityProviderClient({ region });

function isAllowedEmail(email?: string) {
  if (!email) return false;
  return email.toLowerCase().endsWith(allowedEmailDomain);
}

async function signUpUser(email: string, password: string, attributes: Record<string, string> = {}) {
  const command = new SignUpCommand({
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      ...Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      })),
    ],
  });
  return cognito.send(command);
}

async function adminConfirmSignUp(email: string) {
  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID is not configured.");
  }
  const command = new AdminConfirmSignUpCommand({
    UserPoolId: userPoolId,
    Username: email,
  });
  return cognito.send(command);
}

async function signInUser(email: string, password: string) {
  const command = new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  return cognito.send(command);
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!clientId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "COGNITO_USER_POOL_CLIENT_ID is not configured." }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { email, password, attributes } = body;

    if (!isAllowedEmail(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Email must end with ${allowedEmailDomain} for testing`,
        }),
      };
    }

    let created = false;
    try {
      await signUpUser(email, password, attributes || {});
      created = true;
    } catch (error: any) {
      if (error?.name !== "UsernameExistsException") {
        if (error?.name === "InvalidPasswordException") {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Password does not meet the complexity requirements.",
              policy:
                "Password must be at least 8 characters long and include at least one number, one special character, one uppercase letter, and one lowercase letter.",
              details: error.message,
            }),
          };
        }
        console.error("Sign-up error:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: error?.message || "Failed to sign up user.",
          }),
        };
      }
    }

    const messages: string[] = [];
    if (created) {
      messages.push("User signed up successfully.");
    } else {
      messages.push("Account already exists — reusing sandbox credentials.");
    }

    const autoConfirmResult: { enabled: boolean; success?: boolean; error?: string } = {
      enabled: autoConfirmSignups,
    };
    const autoLoginResult: { enabled: boolean; success?: boolean; error?: string } = {
      enabled: autoLoginAfterSignup,
    };

    let authenticationResult: any;

    if (autoConfirmSignups && created) {
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
      const canAttemptLogin =
        !autoConfirmSignups || autoConfirmResult.success !== false;
      if (canAttemptLogin) {
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
        autoLoginResult.error =
          "Skipped auto login because confirmation failed.";
      }
    }

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
      messages.push(
        "Authentication tokens are included for immediate dashboard access."
      );
    } else if (autoLoginAfterSignup && autoLoginResult.error) {
      messages.push("Automatic login failed; try signing in manually.");
    }

    const responsePayload = {
      message: messages.join(" "),
      autoConfirm: autoConfirmResult,
      autoLogin: autoLoginResult,
      AuthenticationResult: authenticationResult,
      existingAccount: !created,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload),
    };
  } catch (err: any) {
    console.error("Unexpected signup handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message || "Unexpected error in signup handler.",
      }),
    };
  }
};

