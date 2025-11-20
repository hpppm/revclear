import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn(async () => "https://signed.example.com");

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((input) => ({ type: "PutObjectCommand", input })),
  GetObjectCommand: jest.fn((input) => ({ type: "GetObjectCommand", input })),
  DeleteObjectCommand: jest.fn((input) => ({ type: "DeleteObjectCommand", input })),
  ListObjectsV2Command: jest.fn((input) => ({
    type: "ListObjectsV2Command",
    input,
  })),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(async () => "https://signed.example.com"),
}));

describe("AWS S3 helpers (TypeScript)", () => {
  let awsS3: typeof import("../src/config/awsS3");

  beforeEach(() => {
    jest.resetModules();
    process.env.AWS_S3_BUCKET = "test-bucket";
    awsS3 = require("../src/config/awsS3");
    mockSend.mockClear();
    mockGetSignedUrl.mockClear();
    (PutObjectCommand as jest.Mock).mockClear();
    (GetObjectCommand as jest.Mock).mockClear();
    (DeleteObjectCommand as jest.Mock).mockClear();
    (ListObjectsV2Command as jest.Mock).mockClear();
  });

  it("exports configured bucket name", () => {
    expect(awsS3.bucketName).toBe("test-bucket");
  });

  it("uploads files with AES256 encryption", async () => {
    await awsS3.uploadFile(
      "reports/encounter.json",
      Buffer.from("{}"),
      "application/json"
    );
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "test-bucket",
        Key: "reports/encounter.json",
        ServerSideEncryption: "AES256",
      })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PutObjectCommand" })
    );
  });

  it("retrieves and deletes objects with the correct keys", async () => {
    await awsS3.getFile("reports/encounter.json");
    expect(GetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "test-bucket", Key: "reports/encounter.json" })
    );
    await awsS3.deleteFile("reports/encounter.json");
    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "test-bucket", Key: "reports/encounter.json" })
    );
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("lists objects with optional prefix", async () => {
    await awsS3.listFiles("reports/");
    expect(ListObjectsV2Command).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "test-bucket", Prefix: "reports/" })
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ListObjectsV2Command" })
    );
  });

  it("creates signed URLs for upload and download", async () => {
    await awsS3.getUploadUrl("reports/encounter.json", 600);
    await awsS3.getDownloadUrl("reports/encounter.json");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: "PutObjectCommand" }),
      expect.objectContaining({ expiresIn: 600 })
    );
  });
});
