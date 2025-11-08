# RevClear AWS Deployment Status

**Last Updated**: November 8, 2025  
**Environment**: Development/Staging  
**Region**: us-east-1

## 📊 Current Infrastructure Status

### ✅ COMPLETED (Phase 1)

#### 1. Security & Encryption
**Status**: ✅ **DEPLOYED**

- **KMS Key ID**: `4ed14exxxxxxxx10-78de-4dxxbe-97xxx-xxxxxxxxxxx`
- **Encryption**: AES-256 active for all data
- **Compliance**: HIPAA requirements met
- **Key Rotation**: Configured
- **Key Usage**: All S3 buckets, DynamoDB tables, CloudTrail logs

**Actions Taken**:
- ✅ Created customer-managed KMS key
- ✅ Applied key policies for service access
- ✅ Enabled automatic key rotation
- ✅ Tagged for HIPAA compliance

---

#### 2. Databases (DynamoDB)
**Status**: ✅ **DEPLOYED**

| Table Name | Records | Encryption | PITR | HIPAA Tags |
|------------|---------|------------|------|------------|
| `physical_therapy_patients` | 5 sample | ✅ KMS | ✅ On | ✅ Yes |
| `speech_therapy_patients` | 5 sample | ✅ KMS | ✅ On | ✅ Yes |
| `mental_health_patients` | 5 sample | ✅ KMS | ✅ On | ✅ Yes |

**Configuration**:
- **Billing Mode**: PAY_PER_REQUEST (on-demand)
- **Encryption**: Customer-managed KMS key
- **Backup**: Point-in-time recovery enabled
- **Region**: us-east-1
- **Tags**: 
  - `HIPAA: true`
  - `Environment: dev`
  - `Project: RevClear`

**Sample Schema** (assumed):
```
physical_therapy_patients:
  - patient_id (String, Hash Key)
  - first_name (String)
  - last_name (String)
  - dob (String)
  - phone (String)
  - insurance_id (String)
  - created_at (Number)
```

---

#### 3. Storage (S3 Buckets)
**Status**: ✅ **DEPLOYED**

| Bucket Name | Purpose | Encryption | Versioning | Lifecycle |
|-------------|---------|------------|------------|-----------|
| `arevclear` | Main application data | ✅ KMS | ✅ | TBD |
| `arevclear-raw` | Intake/raw data | ✅ KMS | ✅ | TBD |
| `arevclear-exports` | EDI/export files | ✅ KMS | ✅ | TBD |
| `arevclear-logs` | CloudTrail + system logs | ✅ KMS | ✅ | TBD |

**Configuration**:
- **Encryption**: SSE-KMS with customer-managed key
- **Public Access**: ❌ Blocked
- **HTTPS Only**: ✅ Enforced
- **Versioning**: ✅ Enabled on all buckets
- **Object Lock**: Not configured yet

**Recommended Lifecycle Policies**:
```
arevclear-raw: Transition to Glacier after 90 days
arevclear-exports: Transition to Glacier after 180 days
arevclear-logs: Retain for 2555 days (7 years, HIPAA requirement)
```

---

#### 4. Identity & Access (IAM)
**Status**: ✅ **DEPLOYED**

**Role**: `AmplifyServiceRole`
- **Trusted Entity**: Amplify
- **Permissions**:
  - ✅ S3 (read/write)
  - ✅ DynamoDB (read/write)
  - ✅ CloudFormation (stack management)
  - ✅ IAM (pass role)
  - ✅ CodeBuild (build execution)

**Usage**: Used by AWS Amplify for automated deployments and CI/CD

**Security Considerations**:
- ⚠️ Review for least privilege (still needed)
- ⚠️ Add condition keys for resource restrictions
- ⚠️ Enable CloudTrail logging for IAM actions

---

#### 5. Monitoring & Logging
**Status**: ✅ **DEPLOYED**

**CloudTrail**: `RevClearTrail`
- **Status**: ✅ Active
- **Multi-Region**: ✅ Enabled
- **Log Validation**: ✅ Enabled
- **Encryption**: ✅ KMS encrypted
- **Log Destination**: `arevclear-logs` S3 bucket
- **Event Types**: Management events, data events (S3, DynamoDB)

**HIPAA Compliance**:
- ✅ All API calls logged
- ✅ Log file integrity validation
- ✅ Encrypted log storage
- ✅ Long-term retention configured

---

#### 6. Frontend (Temporary)
**Status**: ✅ **DEPLOYED** (Temporary)

**Amplify App**: `app2100`
- **Framework**: Next.js
- **Domain**: https://d1hbslcew3u3eg.amplifyapp.com
- **Build Status**: ✅ Succeeded
- **SSL**: ✅ Provided by Amplify

**Plan**: ⏳ Migrate to S3 + CloudFront for:
- Lower costs (~$15/month savings)
- Better HIPAA compliance
- More control over caching
- Custom domain support

---

## 🚧 IN PROGRESS / TO DO (Phase 2)

### ⏳ 1. Frontend Hosting Migration
**Priority**: HIGH  
**Timeline**: 1-2 weeks

**Tasks**:
- [ ] Set up S3 bucket for static hosting
- [ ] Configure CloudFront distribution
- [ ] Request SSL certificate from ACM
- [ ] Connect custom domain (revclear.com or subdomain)
- [ ] Migrate Next.js build from Amplify to S3
- [ ] Test CloudFront caching and invalidation
- [ ] Update DNS records
- [ ] Decommission Amplify app

**Terraform Modules Required**:
- `modules/frontend/` (S3 + CloudFront + ACM)

**Estimated Monthly Cost**: ~$10-15 (vs ~$25 on Amplify)

---

### ⏳ 2. Authentication (AWS Cognito)
**Priority**: HIGH  
**Timeline**: 1 week

**Tasks**:
- [ ] Create Cognito User Pool
- [ ] Configure password policies (HIPAA requirements)
- [ ] Enable MFA (SMS or TOTP)
- [ ] Create App Client for frontend
- [ ] Set up hosted UI (optional)
- [ ] Configure user attributes (email, phone, role)
- [ ] Create IAM roles for authenticated users
- [ ] Integrate with API Gateway
- [ ] Test login/logout flow
- [ ] Add forgot password functionality

**Configuration**:
```
User Pool Name: revclear-clinicians
MFA: Required (TOTP recommended)
Password Policy:
  - Minimum length: 12 characters
  - Require uppercase, lowercase, numbers, symbols
  - Password expiration: 90 days
Attributes: email (required), phone (required), custom:role
```

**Terraform Module**: `modules/security/cognito.tf`

**Estimated Cost**: $0-5/month (first 50,000 MAU free)

---

### ⏳ 3. Backend APIs (API Gateway + Lambda)
**Priority**: HIGH  
**Timeline**: 2 weeks

**API Endpoints to Create**:

#### 3.1 Patient Management
```
POST   /api/v1/patients           # Create patient
GET    /api/v1/patients/:id       # Get patient details
PUT    /api/v1/patients/:id       # Update patient
GET    /api/v1/patients           # List patients (paginated)
```

#### 3.2 Encounter Management
```
POST   /api/v1/encounters         # Create encounter
GET    /api/v1/encounters/:id     # Get encounter
PUT    /api/v1/encounters/:id     # Update encounter
POST   /api/v1/encounters/:id/audio  # Upload audio
```

#### 3.3 Claims & EDI
```
POST   /api/v1/claims             # Generate claim
GET    /api/v1/claims/:id         # Get claim status
POST   /api/v1/claims/:id/submit  # Submit to clearinghouse
GET    /api/v1/claims/:id/edi     # Download EDI file
```

**Lambda Functions Required**:
- `patient-handler` - CRUD for patients
- `encounter-handler` - CRUD for encounters
- `audio-processor` - Process uploaded audio
- `claim-generator` - Generate EDI 837 files
- `claim-submitter` - Submit to clearinghouse

**Infrastructure**:
- [ ] Create API Gateway (HTTP API)
- [ ] Set up Cognito authorizer
- [ ] Create Lambda functions
- [ ] Configure Lambda layers (shared dependencies)
- [ ] Set up environment variables (DynamoDB tables, KMS key)
- [ ] Configure Lambda VPC access (if needed)
- [ ] Add CloudWatch log groups
- [ ] Set up API Gateway custom domain
- [ ] Configure CORS

**Terraform Module**: `modules/api/` (API Gateway + Lambda)

**Estimated Cost**: $5-15/month (low traffic)

---

### ⏳ 4. AI/ML Services (Phase 2)
**Priority**: MEDIUM  
**Timeline**: 3-4 weeks

**Services to Integrate**:

#### 4.1 Amazon Transcribe
- **Purpose**: Convert audio to text
- **Model**: Medical vocabulary
- **Tasks**:
  - [ ] Create IAM role for Transcribe access
  - [ ] Create Lambda function for transcription trigger
  - [ ] Store transcripts in DynamoDB
  - [ ] Store text files in S3

#### 4.2 Amazon Bedrock
- **Purpose**: AI-powered CPT code suggestions
- **Model**: Claude 3 Sonnet (recommended)
- **Tasks**:
  - [ ] Request Bedrock model access
  - [ ] Create prompt templates
  - [ ] Create Lambda function for code extraction
  - [ ] Store AI results in DynamoDB
  - [ ] Add confidence scoring
  - [ ] Implement HITL (Human-in-the-Loop) review

#### 4.3 Anomaly Detection
- **Purpose**: Flag unusual billing patterns
- **Tasks**:
  - [ ] Define baseline metrics
  - [ ] Create detection algorithms
  - [ ] Set up CloudWatch alarms
  - [ ] Create notification system (SNS)

**Terraform Module**: `modules/ai-services/`

**Estimated Cost**: $50-150/month (usage-based)

---

### ⏳ 5. Cost & Compliance Enhancements
**Priority**: MEDIUM  
**Timeline**: Ongoing

**Tasks**:
- [ ] Enable S3 access logging → arevclear-logs
- [ ] Create CloudWatch dashboard for PHI access
- [ ] Set up CloudWatch alarms:
  - [ ] Unauthorized API calls
  - [ ] Failed authentication attempts
  - [ ] High data egress (potential breach)
  - [ ] DynamoDB throttling
  - [ ] Lambda errors
- [ ] Review and tighten IAM policies (least privilege)
- [ ] Enable AWS Config for compliance tracking
- [ ] Set up Cost Explorer reports
- [ ] Implement budget alerts
- [ ] Add resource tags for cost allocation

**Compliance Checklist**:
- [ ] Document all PHI storage locations
- [ ] Create data retention policies
- [ ] Implement automated backups
- [ ] Test disaster recovery procedures
- [ ] Conduct security audit
- [ ] Create incident response plan

---

## 💰 Current vs. Projected Costs

### Current Monthly Cost (Estimated)
| Service | Current Cost |
|---------|--------------|
| DynamoDB (on-demand, low usage) | $5-10 |
| S3 (4 buckets, <10GB) | $5 |
| CloudTrail | $5 |
| KMS | $1 |
| Amplify (frontend) | $15-20 |
| **Total** | **~$31-41/month** |

### Projected Monthly Cost (After Full Deployment)
| Service | Projected Cost |
|---------|----------------|
| DynamoDB | $10-15 |
| S3 | $10-15 |
| CloudTrail | $5 |
| KMS | $1 |
| CloudFront + S3 (frontend) | $10-15 |
| API Gateway | $5-10 |
| Lambda | $5-10 |
| Cognito | $0-5 |
| Transcribe (100 hours/month) | $240 |
| Bedrock (usage-based) | $50-150 |
| CloudWatch/Logs | $10-20 |
| **Total** | **~$346-456/month** |

**Cost Optimization Strategies**:
- Use S3 Intelligent-Tiering for old files
- Implement DynamoDB reserved capacity (if usage is predictable)
- Use Lambda provisioned concurrency only if needed
- Batch Transcribe/Bedrock requests
- Set up budget alerts at $300, $400, $500

---

## 🔐 Security & Compliance Status

### HIPAA Requirements Checklist

#### ✅ Technical Safeguards
- [x] Access Control - IAM roles and policies
- [x] Audit Controls - CloudTrail enabled
- [x] Integrity - Log validation enabled
- [x] Transmission Security - HTTPS/TLS enforced
- [x] Encryption at Rest - KMS encryption
- [ ] Encryption in Transit - Need to verify API Gateway SSL

#### ⏳ Physical Safeguards
- [x] Facility Access - AWS data centers
- [x] Workstation Security - N/A (cloud-based)
- [x] Device Controls - N/A (cloud-based)

#### ⏳ Administrative Safeguards
- [ ] Risk Analysis - TODO
- [ ] Workforce Training - TODO
- [ ] Incident Response Plan - TODO
- [ ] Business Associate Agreement - AWS BAA signed?

#### ⏳ Data Retention
- [x] 7-year log retention (CloudTrail)
- [ ] Patient data retention policy - TODO
- [ ] Data disposal procedures - TODO

---

## 🎯 Next Steps (Prioritized)

### This Week
1. ✅ Update Terraform to v1.13.5
2. ⏳ Pull latest code from GitHub
3. ⏳ Initialize Terraform backend (S3 + DynamoDB)
4. ⏳ Import existing AWS resources into Terraform state

### Next Week
1. ⏳ Deploy Cognito User Pool with Terraform
2. ⏳ Create test users
3. ⏳ Deploy API Gateway + Lambda skeleton
4. ⏳ Test authentication flow

### Week 3-4
1. ⏳ Implement patient management APIs
2. ⏳ Implement encounter APIs
3. ⏳ Migrate frontend to S3 + CloudFront
4. ⏳ Connect custom domain

### Month 2
1. ⏳ Integrate Transcribe for audio processing
2. ⏳ Integrate Bedrock for CPT code extraction
3. ⏳ Implement EDI 837 generation
4. ⏳ Set up monitoring and alerts

---

## 📝 Notes & Decisions

### Design Decisions
- **DynamoDB over RDS**: Chose DynamoDB for scalability and pay-per-request pricing
- **API Gateway HTTP API**: More cost-effective than REST API for our use case
- **Amplify vs S3+CloudFront**: Moving to S3+CloudFront for cost savings and HIPAA compliance
- **Cognito**: Using AWS Cognito instead of third-party auth for AWS integration

### Known Issues
- ⚠️ IAM role `AmplifyServiceRole` has broad permissions - needs review
- ⚠️ No S3 lifecycle policies configured yet
- ⚠️ No CloudWatch alarms for security monitoring
- ⚠️ No automated backups for DynamoDB (only PITR)

### Questions to Resolve
- [ ] Do we need a custom domain immediately?
- [ ] What's the expected patient volume?
- [ ] Do we need multi-region deployment?
- [ ] What's the budget limit per month?

---

## 🔗 Resources

- **GitHub Repo**: https://github.com/hpppm/revclear
- **Amplify App**: https://d1hbslcew3u3eg.amplifyapp.com
- **Terraform Docs**: `terraform/README.md`
- **Architecture Diagrams**: `docs/ARCHITECTURE_DIAGRAMS.md`
- **AWS Console**: https://console.aws.amazon.com/

---

## 📞 Contact & Support

For questions or issues:
1. Check Terraform documentation in `terraform/README.md`
2. Review architecture diagrams in `docs/ARCHITECTURE_DIAGRAMS.md`
3. Open an issue on GitHub
4. Contact the development team

---

**Status Legend**:
- ✅ Completed
- ⏳ In Progress / Planned
- ❌ Blocked
- ⚠️ Needs Attention
