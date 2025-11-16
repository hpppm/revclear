# Implementation Plan

Step-by-step guide to implement the RevClear system

---

## Phase 1: API Gateway Setup

### 🌐 Create API Gateway REST API

1. Create new REST API in AWS Console
2. Configure Cognito User Pool Authorizer
   - User Pool ID: us-east-1_NZCFuSv1l
   - App Client ID: 5g5qvrvd04h9suejmlie2rjncd
3. Create resources and methods from backend/api-gateway-config.json
4. Enable CORS for CloudFront origin
5. Deploy to stage (prod)
6. Note API Gateway URL

---

## Phase 2: Lambda Functions

### ⚡ Deploy Lambda Functions

For each Lambda in backend/lambdas/:

1. Create function in AWS Console
2. Runtime: Node.js 18.x
3. Add environment variables from .env.example
4. Attach execution role with required permissions
5. Connect to API Gateway endpoint
6. Test with sample events

### Lambda Execution Roles

Create IAM role with policies:
- AWSLambdaBasicExecutionRole
- DynamoDB read/write for tenant tables
- S3 read/write for tenant prefixes
- Cognito read for JWT verification
- Transcribe Medical (for transcribeAudio)
- Bedrock InvokeModel (for AI functions)

---

## Phase 3: Enable AI Services

### 🎤 AWS Transcribe Medical

1. Navigate to AWS Transcribe in Console
2. Enable Transcribe Medical
3. Test with sample audio file
4. Update IAM role with transcribe:StartMedicalTranscriptionJob

### 🤖 Amazon Bedrock

1. Navigate to Amazon Bedrock in Console
2. Request model access:
   - Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0)
   - Titan Text Embeddings (amazon.titan-embed-text-v1)
3. Wait for approval (usually instant)
4. Test with sample prompt
5. Update IAM role with bedrock:InvokeModel

---

## Phase 4: Human-in-the-Loop (A2I)

### 👥 Setup Amazon A2I

Three review workflows required:

1. **Transcription Review**
   - Trigger: After transcribeAudio completes
   - Task: Verify transcript accuracy
   - Action: Approve or edit transcript

2. **Code Review**
   - Trigger: After generateCPTcodes completes
   - Task: Verify ICD-10 and CPT codes
   - Action: Approve or modify codes

3. **EDI Review**
   - Trigger: After generateEDI completes
   - Task: Review complete claim
   - Action: Approve for submission or request changes

### A2I Setup Steps

1. Create human review workflow in Amazon A2I Console
2. Define worker task template (UI for reviewers)
3. Configure work team (who can review)
4. Integrate workflow trigger in Lambda functions
5. Test review process

---

## Phase 5: Frontend Deployment

### 🎨 Deploy Frontend to S3 + CloudFront

1. Build React app
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. Create S3 bucket for static hosting
   ```bash
   aws s3 mb s3://revclear-frontend
   aws s3 website s3://revclear-frontend --index-document index.html
   ```

3. Upload build files
   ```bash
   aws s3 sync dist/ s3://revclear-frontend/
   ```

4. Create CloudFront distribution
   - Origin: S3 bucket
   - Viewer Protocol Policy: Redirect HTTP to HTTPS
   - Compress Objects Automatically: Yes

5. Update Cognito redirect URLs
   - Add CloudFront domain to allowed callbacks
   - Update frontend/src/config.js with CloudFront URL

6. Test authentication flow

---

## Phase 6: Logging and Monitoring

### 🔍 Setup CloudWatch

1. Enable CloudWatch Logs for all Lambda functions
2. Create log groups with 30-day retention
3. Create CloudWatch dashboard with:
   - Lambda invocation counts
   - Lambda error rates
   - API Gateway 4xx/5xx errors
   - DynamoDB read/write capacity

### Setup Alarms

1. Lambda errors > threshold
2. API Gateway 5xx > threshold
3. DynamoDB throttling events
4. S3 bucket size > threshold

---

## Phase 7: Testing

### Test Each Component

1. **Authentication**
   - Sign in as clinicianA@example.com
   - Verify Cognito group assignment
   - Verify IAM role assumption

2. **API Endpoints**
   - Test GET /patients
   - Test POST /encounters
   - Test POST /claims

3. **AI Pipeline**
   - Upload audio → transcribeAudio
   - Wait for transcription → A2I review
   - Generate summary → generateSummary
   - Generate codes → generateCPTcodes → A2I review
   - Generate EDI → generateEDI → A2I review
   - Analyze risk → processWithBedrock

4. **Tenant Isolation**
   - Sign in as clinicianA
   - Verify access only to Clinic A data
   - Sign in as clinicianB
   - Verify access only to Clinic B data

---

## Phase 8: Production Deployment

### Final Steps

1. Review all IAM policies for least privilege
2. Enable MFA for all Cognito users
3. Configure backup for DynamoDB tables
4. Enable versioning on S3 buckets
5. Review CloudTrail logs
6. Document API endpoints for users
7. Create user guide for A2I reviewers
8. Train clinic staff on system usage

---

## Next Steps After Implementation

1. Monitor system usage and costs
2. Optimize Lambda memory allocation
3. Enable DynamoDB auto-scaling if needed
4. Add Step Functions for workflow automation
5. Integrate with external clearinghouses
6. Add reporting and analytics dashboard
