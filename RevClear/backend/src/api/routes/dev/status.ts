import { Router } from "express";
import { bucketName } from "../../../config/awsS3";
import { clientId, userPoolId } from "../../../config/awsCognito";
import { testTableName } from "../../../config/awsDynamoDb";
import { authMiddleware } from "../../../middleware/auth";

const router = Router();

// The base path for this route will be /api/status, so the endpoint is GET /api/status
router.get("/", authMiddleware, (_req, res) => {
  const health = {
    awsS3: {
      bucket: bucketName,
      configured: Boolean(bucketName),
    },
    awsCognito: {
      userPoolId,
      clientId,
      configured: Boolean(userPoolId && clientId),
    },
    awsDynamoDb: {
      testTableName,
      configured: Boolean(testTableName),
    },
  };

  res.json({
    success: true,
    health,
    message:
      "AWS storage and auth services are configured according to environment variables.",
  });
});

export default router;
