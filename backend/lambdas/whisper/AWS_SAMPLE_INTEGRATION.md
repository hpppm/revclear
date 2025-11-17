# AWS Sample Integration Guide

This guide explains how to integrate patterns from the AWS sample project:
https://github.com/aws-samples/sample-bedrock-whisper-pii-audio-summarizer

## Overview

The AWS sample demonstrates best practices for:
1. **Whisper transcription** with SageMaker or Lambda
2. **PII redaction** using Bedrock Guardrails
3. **Summarization** with Bedrock models
4. **Step Functions** for workflow orchestration
5. **Frontend integration** with React

## Key Components Integrated

### 1. Enhanced Lambda Handler

We've created `enhanced_lambda_handler.py` that includes:

- **PII Redaction**: Uses Bedrock Guardrails to detect and redact sensitive information
- **Summary Generation**: Generates summaries using Claude via Bedrock
- **S3 Event Handling**: Supports both API calls and S3 triggers
- **Result Persistence**: Saves transcription results back to S3

#### Usage

```python
# Deploy with PII redaction enabled
event = {
    "bucket": "my-bucket",
    "key": "audio/call.mp3",
    "enable_pii_redaction": True,
    "generate_summary": True
}
```

### 2. Audio Conversion Utilities

Location: `utils/audio_converter.py`

The AWS sample requires WAV format for optimal Whisper performance. Our utility converts any audio format to WAV:

```bash
# Convert single file
python utils/audio_converter.py convert input.mp4 -o output.wav

# Batch convert directory
python utils/audio_converter.py batch ./audio_files/ -o ./wav_files/

# Get audio info
python utils/audio_converter.py info audio.mp3
```

#### Why WAV Format?

- Uncompressed format = better accuracy
- 16kHz sample rate = optimal for speech
- Mono channel = faster processing
- Standardized format = consistent results

### 3. Step Functions Workflow

Location: `step_function_definition.json`

The AWS sample uses Step Functions to orchestrate the workflow:

```
Upload Audio → Transcribe → Redact PII → Generate Summary → Save Results
```

#### Deploying Step Functions

Update your Terraform or SAM template:

```hcl
resource "aws_sfn_state_machine" "audio_processor" {
  name     = "revclear-audio-processor"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = templatefile("${path.module}/step_function_definition.json", {
    WhisperLambdaArn      = aws_lambda_function.whisper_transcribe.arn
    PIIRedactionLambdaArn = aws_lambda_function.pii_redaction.arn
    SummaryLambdaArn      = aws_lambda_function.summary.arn
    SaveResultsLambdaArn  = aws_lambda_function.save_results.arn
    ErrorHandlerLambdaArn = aws_lambda_function.error_handler.arn
    GuardrailId           = var.guardrail_id
    BedrockModelId        = var.bedrock_model_id
  })
}
```

### 4. Bedrock Guardrails Setup

#### Creating a Guardrail

```bash
# Create guardrail for PII detection
aws bedrock create-guardrail \
  --name "revclear-pii-guardrail" \
  --description "PII detection for healthcare audio transcriptions" \
  --content-policy-config '{
    "filtersConfig": [
      {
        "type": "PII",
        "inputStrength": "HIGH",
        "outputStrength": "HIGH"
      }
    ]
  }' \
  --sensitive-information-policy-config '{
    "piiEntitiesConfig": [
      {"type": "NAME", "action": "ANONYMIZE"},
      {"type": "EMAIL", "action": "ANONYMIZE"},
      {"type": "PHONE", "action": "ANONYMIZE"},
      {"type": "ADDRESS", "action": "ANONYMIZE"},
      {"type": "SSN", "action": "BLOCK"},
      {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "BLOCK"}
    ]
  }' \
  --blocked-input-messaging "This input contains sensitive information" \
  --blocked-outputs-messaging "This output contains sensitive information"
```

#### Healthcare-Specific PII Types

```json
{
  "piiEntitiesConfig": [
    {"type": "NAME", "action": "ANONYMIZE"},
    {"type": "EMAIL", "action": "ANONYMIZE"},
    {"type": "PHONE", "action": "ANONYMIZE"},
    {"type": "ADDRESS", "action": "ANONYMIZE"},
    {"type": "DATE_TIME", "action": "ANONYMIZE"},
    {"type": "US_SOCIAL_SECURITY_NUMBER", "action": "BLOCK"},
    {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "BLOCK"},
    {"type": "DRIVER_ID", "action": "ANONYMIZE"},
    {"type": "US_BANK_ACCOUNT_NUMBER", "action": "BLOCK"}
  ],
  "regexesConfig": [
    {
      "name": "MedicalRecordNumber",
      "description": "Medical record numbers",
      "pattern": "MRN[:\\s]*[0-9]{6,10}",
      "action": "ANONYMIZE"
    },
    {
      "name": "PatientID",
      "description": "Patient identifiers",
      "pattern": "PATIENT[:\\s]*[A-Z0-9]{8,12}",
      "action": "ANONYMIZE"
    }
  ]
}
```

### 5. Environment Variables

Add these to your Lambda configuration:

```bash
# Whisper Configuration
WHISPER_MODEL_SIZE=base           # tiny, base, small, medium, large
AWS_REGION=us-east-1

# Bedrock Configuration (Optional)
GUARDRAIL_ID=arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# S3 Configuration
S3_BUCKET_MAIN=my-audio-bucket
```

## Implementation Approaches

### Approach 1: Simple Lambda (Current)

**Best for**: Low volume, simple transcription

```
S3 Upload → Lambda (Whisper) → Save to S3
```

**Pros**: Simple, low cost, easy to maintain
**Cons**: Limited by Lambda timeout (15 min), cold starts

### Approach 2: Step Functions (Recommended)

**Best for**: Production use with PII redaction

```
S3 Upload → Step Functions → Whisper → PII Redaction → Summary → Save
```

**Pros**: Reliable, observable, fault-tolerant
**Cons**: More complex, slightly higher cost

### Approach 3: SageMaker Endpoint (AWS Sample)

**Best for**: High volume, always-on service

```
API Request → SageMaker Whisper Endpoint → Lambda (Post-processing) → Save
```

**Pros**: Always warm, consistent performance, scalable
**Cons**: Higher cost, requires SageMaker setup

## Comparison with AWS Sample

| Feature | Our Implementation | AWS Sample |
|---------|-------------------|------------|
| **Whisper Runtime** | Lambda | SageMaker Endpoint |
| **Infrastructure** | Terraform + SAM | CDK |
| **PII Redaction** | Optional Bedrock | Required Bedrock |
| **Frontend** | TBD | React |
| **Workflow** | Direct Lambda | Step Functions |
| **Cost** | Pay per invoke | Always running |

## Migration Path

### Phase 1: Basic Transcription (Current)
- ✅ Lambda with Whisper
- ✅ S3 integration
- ✅ Basic API

### Phase 2: Enhanced Processing
- ⬜ Add PII redaction with Bedrock
- ⬜ Add summary generation
- ⬜ Implement Step Functions

### Phase 3: Production Ready
- ⬜ Move to SageMaker endpoints
- ⬜ Add CloudFront CDN
- ⬜ Implement monitoring/alerting

### Phase 4: Advanced Features
- ⬜ Real-time streaming
- ⬜ Multi-language support
- ⬜ Custom PII patterns for healthcare

## Cost Considerations

### Lambda-based (Current)

```
Assumptions:
- 1000 audio files/month
- Average 5 minutes each
- 30 seconds processing time per file

Costs:
- Lambda (4GB, 30s): $0.0000166667 × 30 × 1000 = $0.50
- S3 storage: $0.023/GB × 10GB = $0.23
- Whisper model load: Included in Lambda time

Total: ~$0.73/month
```

### SageMaker-based (AWS Sample)

```
Assumptions:
- ml.g4dn.xlarge instance
- Running 24/7

Costs:
- SageMaker: $0.526/hour × 730 hours = $384/month
- S3 storage: $0.23/month
- Lambda post-processing: $0.50/month

Total: ~$385/month
```

### With Bedrock (PII + Summary)

```
Additional costs:
- Bedrock Guardrails: $0.75 per 1000 text units
- Claude 3 Sonnet: $3 per 1M input tokens

For 1000 files:
- Guardrails: ~$2
- Summaries: ~$5

Total additional: ~$7/month
```

## Testing

### 1. Test Audio Conversion

```bash
cd utils
pip install -r requirements.txt

# Convert test file
python audio_converter.py convert ../test_audio.mp4
```

### 2. Test Local Lambda

```bash
python enhanced_lambda_handler.py
```

### 3. Test PII Redaction

```python
from enhanced_lambda_handler import redact_pii_with_bedrock

text = "My name is John Doe and my phone is 555-1234"
result = redact_pii_with_bedrock(text, guardrail_id="your-guardrail-id")
print(result['redacted_text'])
# Output: "My name is [NAME] and my phone is [PHONE]"
```

### 4. Test End-to-End

```bash
# Upload test audio
aws s3 cp test_audio.wav s3://your-bucket/test/

# Check Step Functions execution
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:audio-processor

# View results
aws s3 cp s3://your-bucket/test/test_audio_transcript.json -
```

## Security Best Practices

### 1. Encryption

```hcl
# S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "audio" {
  bucket = aws_s3_bucket.audio_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### 2. IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ApplyGuardrail",
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:guardrail/*",
        "arn:aws:bedrock:*::foundation-model/*"
      ]
    }
  ]
}
```

### 3. VPC Configuration

For sensitive data, deploy Lambda in VPC:

```hcl
resource "aws_lambda_function" "whisper_transcribe" {
  # ... other config ...
  
  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}
```

## Monitoring

### CloudWatch Metrics

```bash
# Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=whisper-transcribe \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average

# PII redactions count
aws cloudwatch put-metric-data \
  --namespace RevClear \
  --metric-name PIIRedactions \
  --value 1
```

### CloudWatch Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "whisper-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name        = "Errors"
  namespace          = "AWS/Lambda"
  period             = 300
  statistic          = "Sum"
  threshold          = 5
  alarm_description  = "Alert when Lambda has more than 5 errors"
  
  dimensions = {
    FunctionName = aws_lambda_function.whisper_transcribe.function_name
  }
}
```

## Next Steps

1. ✅ Review this integration guide
2. ⬜ Set up Bedrock Guardrails
3. ⬜ Test PII redaction locally
4. ⬜ Deploy enhanced Lambda handler
5. ⬜ Configure Step Functions
6. ⬜ Add monitoring and alerts
7. ⬜ Test end-to-end workflow

## Resources

- [AWS Sample Repository](https://github.com/aws-samples/sample-bedrock-whisper-pii-audio-summarizer)
- [Bedrock Guardrails Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/best-practices.html)
- [Whisper Documentation](https://github.com/openai/whisper)
