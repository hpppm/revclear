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

const region = appConfig.aws.region;
const bucketName = appConfig.aws.s3Bucket;

if (!bucketName) {
  throw new Error("AWS_S3_BUCKET must be set");
}

const s3Client = new S3Client({ region });

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
 * Get pre-signed URL for file upload
 */
export async function getUploadUrl(key: string, expiresIn: number = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ServerSideEncryption: "aws:kms",
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Get pre-signed URL for file download
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export { s3Client, bucketName };
