# Whisper Lambda Quick Reference

## 🚀 Quick Deploy Commands

### Using Terraform
```bash
cd backend/lambdas/whisper
bash build.sh
cd ../../../terraform
terraform apply
```

### Using SAM
```bash
cd backend/lambdas/whisper
sam build && sam deploy --guided
```

### Using AWS CLI
```bash
cd backend/lambdas/whisper
bash deploy.sh
```

## 📋 Essential Environment Variables

```bash
# Required
WHISPER_MODEL_SIZE=base
AWS_REGION=us-east-1
S3_BUCKET_MAIN=your-audio-bucket

# Optional (for PII + Summary)
GUARDRAIL_ID=arn:aws:bedrock:region:account:guardrail/id
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

## 🎯 Lambda Configuration

```
Runtime:     python3.10
Memory:      4096 MB (minimum)
Timeout:     300 seconds (5 min)
Storage:     2048 MB ephemeral
```

## 📞 API Request Format

### Basic Transcription
```json
{
  "bucket": "audio-bucket",
  "key": "path/to/audio.mp3",
  "language": "en"
}
```

### With PII Redaction
```json
{
  "bucket": "audio-bucket",
  "key": "path/to/audio.mp3",
  "enable_pii_redaction": true,
  "generate_summary": true
}
```

## 🧪 Test Commands

```bash
# Local test
python test_local.py

# AWS invoke
aws lambda invoke \
  --function-name revclear-whisper-transcribe \
  --payload '{"bucket":"test","key":"audio.mp3"}' \
  response.json

# View logs
sam logs -n WhisperTranscribeFunction --tail

# API test
curl -X POST https://API_URL/transcribe \
  -H "Content-Type: application/json" \
  -d '{"bucket":"test","key":"audio.mp3"}'
```

## 🛠️ Utility Scripts

```bash
# Convert audio to WAV
python utils/audio_converter.py convert input.mp4

# Batch convert
python utils/audio_converter.py batch ./audio_dir/

# Get audio info
python utils/audio_converter.py info audio.mp3
```

## 💰 Cost Calculator

| Volume | Lambda Cost | With Bedrock | Total/Month |
|--------|-------------|--------------|-------------|
| 100    | $0.07       | $0.70        | $0.77       |
| 1,000  | $0.70       | $7.00        | $7.70       |
| 10,000 | $7.00       | $70.00       | $77.00      |

## 🔍 Monitoring Queries

### CloudWatch Insights
```
# Find errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc

# Average duration
stats avg(duration) by bin(5m)

# PII detections
fields @timestamp, pii_detected
| filter pii_detected = true
| count
```

## 📊 Whisper Model Comparison

| Model  | Size    | Memory | Speed    | Accuracy |
|--------|---------|--------|----------|----------|
| tiny   | 75 MB   | 2 GB   | Fastest  | Basic    |
| base   | 142 MB  | 4 GB   | Fast     | Good     |
| small  | 466 MB  | 6 GB   | Medium   | Better   |
| medium | 1.5 GB  | 10 GB  | Slow     | Great    |

## 🔐 IAM Permissions Needed

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ApplyGuardrail",
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Timeout | Increase timeout, use smaller model |
| Out of memory | Increase memory, use tiny/base model |
| Slow cold start | Use provisioned concurrency |
| CDK not found | Restart terminal: `npx aws-cdk` |
| PII not working | Check GUARDRAIL_ID is set |

## 📁 File Structure

```
backend/lambdas/whisper/
├── lambda_handler.py              # Basic handler
├── enhanced_lambda_handler.py     # With PII + Summary
├── requirements.txt               # Python deps
├── template.yaml                  # SAM template
├── Dockerfile                     # Container image
├── build.sh                       # Build script
├── deploy.sh                      # Deploy script
├── test_local.py                  # Local test
├── utils/
│   ├── audio_converter.py        # Audio conversion
│   └── requirements.txt          # Utils deps
└── docs/
    ├── README.md                 # Full documentation
    ├── SAM_DEPLOYMENT.md         # SAM guide
    ├── AWS_SAMPLE_INTEGRATION.md # AWS patterns
    └── INTEGRATION_SUMMARY.md    # Overview
```

## 🔗 Important Links

- **AWS Sample**: https://github.com/aws-samples/sample-bedrock-whisper-pii-audio-summarizer
- **Whisper Docs**: https://github.com/openai/whisper
- **Bedrock Guardrails**: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html
- **SAM CLI**: https://docs.aws.amazon.com/serverless-application-model/

## ⚡ One-Line Shortcuts

```bash
# Full deploy (Terraform)
cd backend/lambdas/whisper && bash build.sh && cd ../../../terraform && terraform apply

# Full deploy (SAM)
cd backend/lambdas/whisper && sam build && sam deploy

# Quick test
aws lambda invoke --function-name revclear-whisper-transcribe --payload '{"bucket":"test","key":"audio.mp3"}' out.json && cat out.json

# Watch logs
aws logs tail /aws/lambda/revclear-whisper-transcribe --follow

# Convert and upload
python utils/audio_converter.py convert input.mp4 && aws s3 cp input.wav s3://bucket/audio/
```

## 📊 Decision Matrix

### When to use Basic Lambda
- ✅ < 1000 files/month
- ✅ Non-sensitive data
- ✅ Development/testing
- ✅ Cost is primary concern

### When to use Enhanced Lambda
- ✅ Healthcare/sensitive data
- ✅ Need PII redaction
- ✅ Need summaries
- ✅ 1000-10000 files/month

### When to use SageMaker
- ✅ > 10000 files/month
- ✅ Need < 1s response time
- ✅ 24/7 availability required
- ✅ Budget allows $400+/month

---

**Pro Tip**: Start with basic Lambda, upgrade to enhanced when needed, move to SageMaker only for high volume.
