import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { APIGatewayProxyHandlerV2 } from "aws-lambda";

const region = process.env.AWS_REGION || "us-east-1";
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID || "";

const cognito = new CognitoIdentityProviderClient({ region });

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
        body: JSON.stringify({
          error: "COGNITO_USER_POOL_CLIENT_ID is not configured.",
        }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "email and password are required.",
        }),
      };
    }

    const result = await signInUser(email, password);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User signed in successfully.",
        AuthenticationResult: result.AuthenticationResult,
      }),
    };
  } catch (error: any) {
    console.error("Sign-in error:", error);
    const status = error?.name === "NotAuthorizedException" ? 401 : 500;
    return {
      statusCode: status,
      body: JSON.stringify({
        error: error?.message || "Failed to sign in user.",
      }),
    };
  }
};

