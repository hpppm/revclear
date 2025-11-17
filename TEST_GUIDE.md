# RevClear Testing Guide

## Your Existing Resources

```
Account ID: 414669980881
Region: us-east-1

Lambda Functions:
  - kr (existing)

S3 Buckets:
  - arevclear (main)
  - arevclear-exports
  - arevclear-logs
  - arevclear-raw
  - revclear-ai-data-414669980881
  - revclear-terraform-state-414669980881

DynamoDB Tables:
  - mental_health_patients
  - physical_therapy_patients
  - speech_therapy_patients

API Gateway:
  - kr-API (ID: 426dw5oum5)
  - URL: https://426dw5oum5.execute-api.us-east-1.amazonaws.com/default

IAM Role:
  - revclear-lambda-role

CloudWatch Logs:
  - /aws/lambda/processAudioLambda
  - /aws/lambda/seed-multitenant-patients
```

## Test Your Existing Infrastructure

### 1. Test S3 Buckets
```bash
# List all buckets
aws s3 ls

# Upload test file
aws s3 cp /mnt/c/Dev/test_audio.wav s3://arevclear/test/audio/test.wav

# Verify upload
aws s3 ls s3://arevclear/test/audio/

# List all files
aws s3 ls s3://arevclear/ --recursive
```

### 2. Test Lambda Function "kr"
```bash
# Create S3 event payload
cat > s3-event.json << 'EOF'
{
  "Records": [{
    "s3": {
      "bucket": {"name": "arevclear"},
      "object": {"key": "test/audio/test.wav"}
    }
  }]
}
EOF

# Invoke Lambda
aws lambda invoke \
  --function-name kr \
  --payload file://s3-event.json \
  output.json

cat output.json

# Check logs
aws logs tail /aws/lambda/processAudioLambda --since 10m
```

### 3. Test API Gateway
```bash
# Your API endpoint
API_URL="https://426dw5oum5.execute-api.us-east-1.amazonaws.com/default"

# Test endpoint
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 4. Check DynamoDB Tables
```bash
# Scan patient tables
aws dynamodb scan --table-name mental_health_patients --max-items 3
aws dynamodb scan --table-name physical_therapy_patients --max-items 3
aws dynamodb scan --table-name speech_therapy_patients --max-items 3
```

### 5. Check CloudWatch Logs
```bash
# List log groups
aws logs describe-log-groups

# Tail logs in real-time
aws logs tail /aws/lambda/processAudioLambda --follow

# Get recent logs
aws logs tail /aws/lambda/processAudioLambda --since 1h
```

### 6. Check CloudTrail Events
```bash
# Recent events
aws cloudtrail lookup-events --max-results 10

# Specific event
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutObject \
  --max-results 5
```

## Verification Checklist

- [x] S3 buckets exist and accessible
- [x] Lambda function "kr" exists
- [x] DynamoDB tables with patient data
- [x] API Gateway endpoint responding
- [x] CloudWatch logs working
- [x] IAM role configured

## Common Issues

**S3 Access Denied**: Check bucket policy and IAM permissions
**Lambda Error**: Check CloudWatch logs for details
**API 403**: Verify API Gateway configuration
**No Logs**: Log group may not exist yet
