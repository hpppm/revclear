/**
 * Cognito Identity Pool — scoped credential exchange.
 *
 * Exchanges a Cognito User Pool access token for temporary AWS credentials
 * scoped to the user's IAM role (Admin → RevclearAdminRole,
 * Users → RevclearClinicianRole). These credentials are used to generate
 * pre-signed S3 URLs that inherit the role's permission boundary, enforcing
 * tenant isolation at the AWS layer rather than just the application layer.
 *
 * Credentials are cached in memory per userId for their remaining lifetime
 * (up to 1 hour) to avoid a round-trip to Cognito on every request.
 */

import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from "@aws-sdk/client-cognito-identity";
import { appConfig } from "./appConfig";
import logger from "../utils/logger";

const region = appConfig.aws.region;
const identityPoolId = appConfig.aws.identityPoolId;
const userPoolId = process.env.AWS_USER_POOL_ID;

const identityClient = new CognitoIdentityClient({ region });

// Login provider key used by Cognito Identity
const loginProvider = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

export interface ScopedCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

// In-memory cache: userId → { credentials, expiration }
const credentialCache = new Map<string, ScopedCredentials>();

function isFresh(creds: ScopedCredentials): boolean {
  // Treat credentials as stale 5 minutes before they expire
  return creds.expiration.getTime() - Date.now() > 5 * 60 * 1000;
}

// Purge expired entries every 30 minutes so the Map doesn't grow unbounded
// in long-running server processes.
const CACHE_PURGE_INTERVAL_MS = 30 * 60 * 1000;
const cachePurgeTimer = setInterval(() => {
  const now = Date.now();
  for (const [userId, creds] of credentialCache) {
    if (creds.expiration.getTime() <= now) {
      credentialCache.delete(userId);
    }
  }
}, CACHE_PURGE_INTERVAL_MS);
// Don't keep the process alive just for this timer
cachePurgeTimer.unref();

/**
 * Exchange a Cognito access token for scoped IAM credentials.
 * Result is cached per userId until 5 minutes before expiry.
 */
export async function getScopedCredentials(
  userId: string,
  accessToken: string,
): Promise<ScopedCredentials> {
  // Return cached credentials if still fresh
  const cached = credentialCache.get(userId);
  if (cached && isFresh(cached)) {
    return cached;
  }

  if (!identityPoolId) {
    throw new Error("AWS_IDENTITY_POOL_ID is not configured");
  }

  if (!userPoolId) {
    throw new Error("AWS_USER_POOL_ID is not configured");
  }

  // Step 1: resolve the Cognito Identity ID for this user
  const getIdResult = await identityClient.send(
    new GetIdCommand({
      IdentityPoolId: identityPoolId,
      Logins: { [loginProvider]: accessToken },
    }),
  );

  if (!getIdResult.IdentityId) {
    throw new Error("Failed to resolve Cognito Identity ID");
  }

  // Step 2: exchange for temporary AWS credentials
  const getCredsResult = await identityClient.send(
    new GetCredentialsForIdentityCommand({
      IdentityId: getIdResult.IdentityId,
      Logins: { [loginProvider]: accessToken },
    }),
  );

  const c = getCredsResult.Credentials;
  if (!c?.AccessKeyId || !c?.SecretKey || !c?.SessionToken || !c?.Expiration) {
    throw new Error("Incomplete credentials returned from Identity Pool");
  }

  const scoped: ScopedCredentials = {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretKey,
    sessionToken: c.SessionToken,
    expiration: c.Expiration,
  };

  credentialCache.set(userId, scoped);
  logger.info(
    { userId, expiration: scoped.expiration },
    "identity-pool: scoped credentials issued",
  );

  return scoped;
}

/**
 * Clear cached credentials for a user (call on logout).
 */
export function clearCredentialCache(userId: string): void {
  credentialCache.delete(userId);
}
