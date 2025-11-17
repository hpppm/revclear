# AWS SAM Deployment Guide for Whisper Lambda

This guide explains how to deploy the Whisper Lambda function using AWS SAM (Serverless Application Model).

## Prerequisites

1. **AWS CLI** - Already installed
2. **AWS SAM CLI** - Install with: `pip install aws-sam-cli`
3. **Docker** - Required for building Python dependencies
4. **AWS Credentials** - Configured with appropriate permissions

## Installation

### Install SAM CLI

```bash
pip install aws-sam-cli
```

Verify installation:
```bash
sam --version
```

## Deployment Steps

### 1. Build the Application

SAM will build your Lambda function and package dependencies:

```bash
cd backend/lambdas/whisper
sam build
```

This creates a `.aws-sam` directory with your built application.

### 2. Deploy (First Time)

For the first deployment, use guided mode:

```bash
sam deploy --guided
```

You'll be prompted for:
- **Stack Name**: e.g., `revclear-whisper-stack`
- **AWS Region**: e.g., `us-east-1`
- **Parameter Environment**: `dev`, `staging`, or `prod`
- **Parameter AudioBucketName**: Your S3 bucket name (or leave empty to create new)
- **Parameter CognitoUserPoolId**: Your Cognito User Pool ID
- **Confirm changes before deploy**: Y
- **Allow SAM CLI IAM role creation**: Y
- **Save arguments to configuration file**: Y

### 3. Subsequent Deployments

After the first deployment, you can use:

```bash
sam build && sam deploy
```

This uses the saved configuration from `samconfig.toml`.

## Configuration File

After guided deployment, SAM creates `samconfig.toml`:

```toml
version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "revclear-whisper-stack"
s3_bucket = "aws-sam-cli-managed-default-samclisourcebucket-xxxxx"
s3_prefix = "revclear-whisper-stack"
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "Environment=\"dev\" AudioBucketName=\"my-audio-bucket\" CognitoUserPoolId=\"us-east-1_xxxxx\""
```

## Testing the Deployment

### 1. Test with SAM Local

Test locally before deploying:

```bash
# Start API locally
sam local start-api

# Invoke function locally
sam local invoke WhisperTranscribeFunction --event test-event.json
```

Create `test-event.json`:
```json
{
  "bucket": "your-bucket",
  "key": "audio/test.mp3",
  "language": "en"
}
```

### 2. Test the Deployed Function

```bash
# Invoke directly
aws lambda invoke \
  --function-name revclear-whisper-transcribe \
  --payload '{"bucket":"your-bucket","key":"audio/test.mp3"}' \
  response.json

# View response
cat response.json
```

### 3. Test via API Gateway

```bash
# Get the API URL from outputs
sam list stack-outputs

# Make a POST request
curl -X POST \
  https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/transcribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
  -d '{
    "bucket": "your-audio-bucket",
    "key": "audio/sample.mp3",
    "language": "en"
  }'
```

## Updating the Function

### Update Code Only

```bash
sam build
sam deploy --no-confirm-changeset
```

### Update Configuration

Edit `template.yaml`, then:

```bash
sam build
sam deploy
```

## Monitoring and Logs

### View Logs

```bash
# Tail logs in real-time
sam logs -n WhisperTranscribeFunction --tail

# View logs for specific time range
sam logs -n WhisperTranscribeFunction --start-time '10min ago'

# Filter logs
sam logs -n WhisperTranscribeFunction --filter "ERROR"
```

### CloudWatch Insights

```bash
aws logs start-query \
  --log-group-name /aws/lambda/revclear-whisper-transcribe \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc'
```

## Stack Management

### View Stack Resources

```bash
sam list resources
sam list stack-outputs
```

### Update Stack

```bash
sam deploy
```

### Delete Stack

```bash
sam delete
```

This removes all resources created by the stack.

## Advanced Configuration

### Using Existing S3 Bucket

If you have an existing S3 bucket, update the template to reference it instead of creating a new one. Comment out the `AudioBucket` resource and use parameters.

### Custom Domain

Add a custom domain to API Gateway:

```yaml
WhisperApi:
  Type: AWS::Serverless::Api
  Properties:
    # ... existing properties
    Domain:
      DomainName: api.yourdomain.com
      CertificateArn: arn:aws:acm:us-east-1:xxxxx:certificate/xxxxx
```

### Environment-Specific Configuration

Use parameter overrides:

```bash
# Development
sam deploy --parameter-overrides Environment=dev MemorySize=2048

# Production
sam deploy --parameter-overrides Environment=prod MemorySize=8192
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy Whisper Lambda
on:
  push:
    branches: [main]
    paths:
      - 'backend/lambdas/whisper/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: sam build
        working-directory: backend/lambdas/whisper
      - run: sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
        working-directory: backend/lambdas/whisper
```

## Troubleshooting

### Build Fails

```bash
# Clean build artifacts
sam build --use-container --debug

# Force rebuild
rm -rf .aws-sam
sam build
```

### Deployment Fails

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name revclear-whisper-stack \
  --max-items 20

# Validate template
sam validate
```

### Function Timeout

Increase timeout in `template.yaml`:

```yaml
Globals:
  Function:
    Timeout: 600  # 10 minutes
```

### Out of Memory

Increase memory in `template.yaml`:

```yaml
Globals:
  Function:
    MemorySize: 8192  # 8GB
```

## Cost Optimization

1. **Use smaller Whisper model**: Change `WHISPER_MODEL_SIZE` to `tiny` or `small`
2. **Set lifecycle policies**: Delete old audio files automatically
3. **Use provisioned concurrency**: Only for high-traffic APIs
4. **Monitor CloudWatch costs**: Set up billing alerts

## Comparison: SAM vs Terraform

| Feature | SAM | Terraform |
|---------|-----|-----------|
| Learning Curve | Easy | Moderate |
| AWS-Specific | Yes | No (multi-cloud) |
| Local Testing | Excellent | Limited |
| CI/CD | Built-in | Requires setup |
| State Management | CloudFormation | State files |
| Best For | AWS Lambda/API | Full infrastructure |

## Next Steps

1. Set up monitoring and alarms
2. Configure auto-scaling
3. Implement API throttling
4. Add request validation
5. Set up X-Ray tracing

## Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [SAM Examples](https://github.com/aws/serverless-application-model/tree/master/examples)
