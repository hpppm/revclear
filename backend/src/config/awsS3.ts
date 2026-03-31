// AWS S3 Storage Configuration
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { appConfig } from "./appConfig";
import type { ScopedCredentials } from "./awsIdentityPool";

const region = appConfig.aws.region;
const bucketName = appConfig.aws.s3Bucket;

if (!bucketName) {
  throw new Error("AWS_S3_BUCKET must be set");
}

// Default server-side S3 client (uses the server's IAM role).
// Used for internal operations and as fallback when Identity Pool is unconfigured.
const s3Client = new S3Client({ region });

/**
 * Build a temporary S3 client scoped to a user's Identity Pool credentials.
 * Pre-signed URLs generated with this client inherit the role's permission
 * boundary (e.g. clinicians can only sign URLs for audio/* objects).
 */
export function getScopedS3Client(creds: ScopedCredentials): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}

/**
 * Upload file to S3
 */
export async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType?: string
) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: "aws:kms",
  });

  return s3Client.send(command);
}

/**
 * Get file from S3
 */
export async function getFile(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return s3Client.send(command);
}

/**
 * Delete file from S3
 */
export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return s3Client.send(command);
}

/**
 * List files in S3
 */
export async function listFiles(prefix?: string) {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  return s3Client.send(command);
}

/**
 * Get pre-signed URL for file upload.
 * Pass a scoped client to sign with Identity Pool credentials instead of the
 * server role — the URL will then only work within that role's S3 permissions.
 */
export async function getUploadUrl(
  key: string,
  expiresIn: number = 3600,
  client: S3Client = s3Client,
) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ServerSideEncryption: "aws:kms",
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Get pre-signed URL for file download.
 * Pass a scoped client to enforce the role's permission boundary on the URL.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600,
  client: S3Client = s3Client,
) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

export { s3Client, bucketName };
