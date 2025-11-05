// AWS Cognito Authentication Configuration
import { 
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
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

export { cognitoClient };
