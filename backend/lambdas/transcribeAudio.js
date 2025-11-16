/**
 * Lambda: Transcribe Audio
 * 
 * Service: AWS Lambda + AWS Transcribe Medical
 * Trigger: API Gateway POST /ai/transcribe
 * 
 * Function:
 * - Verify Cognito JWT token
 * - Extract tenant from token groups
 * - Upload audio file to S3
 * - Start AWS Transcribe Medical job
 * - Store job ID for status tracking
 * - Return job ID
 * 
 * Human Review: Required after transcription completes (A2I checkpoint 1)
 * 
 * Environment Variables Required:
 * - COGNITO_USER_POOL_ID: us-east-1_NZCFuSv1l
 * - S3_BUCKET_MAIN: arevclear
 * - S3_PREFIX_AI: arevclear/ai/
 * - AWS_REGION: us-east-1
 * 
 * IAM Permissions Required:
 * - s3:PutObject on arevclear/ai/*
 * - transcribe:StartMedicalTranscriptionJob
 * - transcribe:GetMedicalTranscriptionJob
 * 
 * AWS Services to Enable:
 * - AWS Transcribe Medical
 */

exports.handler = async (event) => {
  // TODO: Implement JWT verification
  // TODO: Upload audio to S3
  // TODO: Start Transcribe Medical job
  // TODO: Store job ID
  // TODO: Return job ID for status polling
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Not implemented yet' })
  };
};
