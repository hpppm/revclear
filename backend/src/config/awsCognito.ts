// AWS Cognito Authentication Configuration
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  DescribeUserPoolClientCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminUpdateUserAttributesCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const region = process.env.AWS_REGION || 'us-east-1';
const userPoolId = process.env.AWS_USER_POOL_ID;
const clientId = process.env.AWS_CLIENT_ID;

if (!userPoolId || !clientId) {
  throw new Error('AWS_USER_POOL_ID and AWS_CLIENT_ID must be set');
}

const cognitoClient = new CognitoIdentityProviderClient({ region });

// JWKS client for token verification
const jwks = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

/**
 * Verify Cognito JWT token
 */
export async function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Sign up a new user
 */
export async function signUpUser(email: string, password: string, attributes: Record<string, string> = {}) {
  const command = new SignUpCommand({
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      ...Object.entries(attributes).map(([key, value]) => ({
        Name: key,
        Value: value,
      })),
    ],
  });

  return cognitoClient.send(command);
}

/**
 * Confirm user sign up
 */
export async function confirmSignUp(email: string, code: string) {
  const command = new ConfirmSignUpCommand({
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
  });

  return cognitoClient.send(command);
}

/**
 * Sign in user
 */
export async function signInUser(email: string, password: string) {
  const command = new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  return cognitoClient.send(command);
}

/**
 * Refresh authentication tokens
 */
export async function refreshAuthTokens(refreshToken: string) {
  const command = new InitiateAuthCommand({
    ClientId: clientId,
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  return cognitoClient.send(command);
}

/**
 * Sign out user globally
 */
export async function signOutUser(accessToken: string) {
  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });
  return cognitoClient.send(command);
}

/**
 * Initiate forgot password flow
 */
export async function forgotPassword(email: string) {
  const command = new ForgotPasswordCommand({
    ClientId: clientId,
    Username: email,
  });
  return cognitoClient.send(command);
}

/**
 * Confirm forgot password
 */
export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  const command = new ConfirmForgotPasswordCommand({
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
  return cognitoClient.send(command);
}


/**
 * Admin create user (for testing or admin operations)
 */
export async function adminCreateUser(email: string, tempPassword: string) {
  const command = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: email,
    TemporaryPassword: tempPassword,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
    ],
  });

  return cognitoClient.send(command);
}

/**
 * Admin set permanent password
 */
export async function adminSetUserPassword(email: string, password: string) {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: email,
    Password: password,
    Permanent: true,
  });

  return cognitoClient.send(command);
}

/**
 * Admin confirm a user without requiring the verification code.
 * Useful for local/testing flows where email delivery is disabled.
 */
export async function adminConfirmSignUp(email: string) {
  const command = new AdminConfirmSignUpCommand({
    UserPoolId: userPoolId,
    Username: email,
  });

  return cognitoClient.send(command);
}

/**
 * Admin mark email as verified.
 * Crucial for auto-confirmed users to be able to receive forgot-password emails.
 */
export async function adminMarkEmailVerified(email: string) {
  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
    ],
  });

  return cognitoClient.send(command);
}

/**
 * Describe the configured user pool client to verify connectivity and permissions.
 */
export async function checkCognitoConnectivity() {
  const command = new DescribeUserPoolClientCommand({
    UserPoolId: userPoolId,
    ClientId: clientId,
  });
  return cognitoClient.send(command);
}

/**
 * Respond to an EMAIL_OTP MFA challenge after initial sign-in.
 */
export async function respondToEmailOtp(email: string, session: string, code: string) {
  const command = new RespondToAuthChallengeCommand({
    ClientId: clientId,
    ChallengeName: 'EMAIL_OTP',
    Session: session,
    ChallengeResponses: {
      USERNAME: email,
      EMAIL_OTP_CODE: code,
    },
  });
  return cognitoClient.send(command);
}

export { cognitoClient, userPoolId, clientId };

/**
 * Admin add user to a Cognito group.
 */
export async function adminAddUserToGroup(email: string, groupName: string) {
  const { AdminAddUserToGroupCommand } = await import('@aws-sdk/client-cognito-identity-provider');
  const command = new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: email,
    GroupName: groupName,
  });
  return cognitoClient.send(command);
}
