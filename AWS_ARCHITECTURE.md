# AWS Services Architecture - RevClear

## 🏗️ Complete Services Relationship Map

This document explains how ALL AWS services work together in the RevClear system.

---

## 📋 All Services Summary

### Core Services (Already Configured)
1. ✅ **RDS PostgreSQL** - Main database
2. ✅ **S3** - File storage
3. ✅ **Cognito** - User authentication
4. ✅ **CloudWatch** - Logging & monitoring
5. ✅ **Secrets Manager** - Secure credentials
6. ✅ **ECR** - Container registry

### Additional Services (New)
7. 🆕 **Lambda** - Serverless AI functions
8. 🆕 **SQS** - Message queuing
9. 🆕 **SNS** - Notifications
10. 🆕 **KMS** - Encryption keys
11. 🆕 **EventBridge** - Event automation
12. 🆕 **CloudTrail** - Audit logging
13. 🆕 **AWS Backup** - Backup management
14. 🆕 **Transcribe Medical** - Speech-to-text
15. 🆕 **Comprehend Medical** - Medical NLP
16. 🆕 **WAF** - Web firewall
17. 🆕 **API Gateway** - API management
18. 🆕 **Systems Manager** - Configuration

---

## 🔄 Service Relationships - Simple Flow

```
USER (Clinician)
    ↓
[COGNITO] ← Authenticates user
    ↓
[API GATEWAY] ← API endpoint + rate limiting
    ↓
[WAF] ← Blocks attacks
    ↓
[ECS/BACKEND API] ← Node.js/Express server
    ↓
    ├──→ [RDS PostgreSQL] ← Encrypted by [KMS]
    │         ↓
    │    [AWS BACKUP] ← Daily backups
    │
    ├──→ [S3] ← Store audio files, encrypted by [KMS]
    │     ↓
    │    [TRANSCRIBE MEDICAL] ← Convert audio to text
    │         ↓
    │    [LAMBDA] ← Process transcript
    │         ↓
    │    [COMPREHEND MEDICAL] ← Extract medical entities
    │         ↓
    │    [SQS] ← Queue for processing
    │         ↓
    │    [LAMBDA] ← Generate SOAP notes
    │         ↓
    │    [RDS] ← Save results
    │
    ├──→ [SECRETS MANAGER] ← Get credentials (encrypted by KMS)
    │
    ├──→ [CLOUDWATCH] ← Send logs
    │
    ├──→ [CLOUDTRAIL] ← Audit all API calls
    │
    ├──→ [EVENTBRIDGE] ← Trigger automated tasks
    │         ↓
    │    [LAMBDA] ← Process events
    │         ↓
    │    [SNS] ← Send notifications
    │         ↓
    │    USER ← Email/SMS alerts
    │
    └──→ [SYSTEMS MANAGER] ← Get configuration
```

---

## 🎯 Detailed Service Relationships

### 1. User Access Flow
```
Clinician opens app
    ↓
[Cognito] Authenticates with email/password
    ↓
Returns JWT token
    ↓
Frontend stores token
    ↓
All API requests include: Authorization: Bearer <token>
    ↓
[API Gateway] validates token with Cognito
    ↓
[WAF] checks for attacks
    ↓
Request reaches backend
```

**Services:** Cognito → API Gateway → WAF → Backend

---

### 2. Audio Processing Flow (Core Feature)
```
Clinician uploads encounter audio
    ↓
[Backend API] receives file
    ↓
[S3] stores audio file (encrypted by KMS)
    ↓
[EventBridge] detects new file event
    ↓
[Lambda] triggered automatically
    ↓
[Transcribe Medical] converts audio to text
    ↓
[Lambda] receives transcript
    ↓
[Comprehend Medical] extracts medical terms
    ↓
[Lambda] generates SOAP note
    ↓
[RDS] saves SOAP note
    ↓
[EventBridge] triggers notification
    ↓
[SNS] sends email to clinician
    ↓
Clinician receives "SOAP ready" notification
```

**Services:** S3 → EventBridge → Lambda → Transcribe Medical → Comprehend Medical → Lambda → RDS → EventBridge → SNS

---

### 3. Database Operations Flow
```
API needs to query data
    ↓
[Backend] requests credentials
    ↓
[Secrets Manager] returns encrypted credentials (decrypted by KMS)
    ↓
[Backend] connects to [RDS PostgreSQL]
    ↓
All queries encrypted in transit (TLS)
    ↓
Data encrypted at rest (KMS)
    ↓
Query logged to [CloudWatch]
    ↓
Access logged to [CloudTrail]
    ↓
[AWS Backup] runs daily backup
```

**Services:** Backend → Secrets Manager → KMS → RDS → CloudWatch → CloudTrail → AWS Backup

---

### 4. Claim Processing Flow
```
Clinician submits claim
    ↓
[Backend API] receives claim data
    ↓
[SQS] queues claim for processing
    ↓
[Lambda] picks up message from queue
    ↓
[Lambda] validates claim data
    ↓
[RDS] saves claim
    ↓
[EventBridge] schedules submission
    ↓
[Lambda] submits to insurance API
    ↓
[RDS] updates claim status
    ↓
[SNS] notifies clinician
```

**Services:** Backend → SQS → Lambda → RDS → EventBridge → Lambda → SNS

---

### 5. Security & Compliance Flow
```
Any API request
    ↓
[WAF] blocks if malicious
    ↓
[API Gateway] rate limits requests
    ↓
[Cognito] validates JWT token
    ↓
[Backend] processes request
    ↓
[CloudTrail] logs: who, what, when, IP
    ↓
[KMS] encrypts all sensitive data
    ↓
[CloudWatch] monitors for anomalies
    ↓
Alert → [SNS] → Security team
```

**Services:** WAF → API Gateway → Cognito → Backend → CloudTrail → KMS → CloudWatch → SNS

---

### 6. Backup & Recovery Flow
```
Every day at 3 AM:
    ↓
[AWS Backup] triggered
    ↓
[RDS] snapshot created (encrypted by KMS)
    ↓
[S3] files backed up to separate bucket
    ↓
[AWS Backup] replicates to second region
    ↓
[CloudWatch] confirms success
    ↓
Retention: 7 years (HIPAA)
```

**Services:** AWS Backup → RDS → S3 → KMS → CloudWatch

---

### 7. Notification Flow
```
Event occurs (claim ready, error, etc.)
    ↓
[EventBridge] detects event
    ↓
[Lambda] formats notification message
    ↓
[SNS] determines delivery method
    ↓
├─→ Email to clinician
├─→ SMS to admin (if urgent)
└─→ Push notification to app
```

**Services:** EventBridge → Lambda → SNS

---

## 🔐 Security Layer Interactions

```
ALL DATA FLOW goes through these security layers:

1. Network Layer:
   [WAF] → blocks attacks
   
2. Authentication Layer:
   [Cognito] → verifies identity
   [API Gateway] → validates tokens
   
3. Encryption Layer:
   [KMS] → encrypts all data at rest
   TLS 1.3 → encrypts all data in transit
   
4. Access Control Layer:
   IAM Roles → controls service permissions
   [Secrets Manager] → stores credentials securely
   
5. Audit Layer:
   [CloudTrail] → logs all API calls (6 years)
   [CloudWatch] → monitors real-time activity
```

---

## 🎬 Real-World Example: Complete Encounter Flow

**Scenario:** Dr. Smith sees patient John Doe

```
1. Login
   Dr. Smith logs in → [Cognito] authenticates → Returns JWT token

2. Create Encounter
   Frontend → [API Gateway] → [Backend] → [RDS] creates encounter record
   [CloudTrail] logs: "Dr. Smith created encounter #123"

3. Record Audio
   Dr. Smith records conversation → [S3] stores audio (encrypted by KMS)
   [CloudWatch] logs: "Audio uploaded for encounter #123"

4. Auto-Processing (Async)
   [EventBridge] detects new audio → Triggers [Lambda]
   [Lambda] → [Transcribe Medical] converts audio to text
   [Lambda] → [Comprehend Medical] extracts: "Type 2 diabetes, Metformin"
   [Lambda] → Generates SOAP note
   [Lambda] → [RDS] saves SOAP note
   [EventBridge] → [SNS] → Email to Dr. Smith: "SOAP ready"

5. Review & Submit
   Dr. Smith reviews SOAP → Makes edits → [Backend] → [RDS] updates
   Dr. Smith submits claim → [SQS] queues claim
   [Lambda] processes claim → [RDS] saves claim
   [EventBridge] schedules submission → [Lambda] submits to insurance

6. Notification
   Insurance responds → [Lambda] updates status → [RDS]
   [SNS] sends email: "Claim approved"

7. Audit Trail
   [CloudTrail] has complete record:
   - 10:00 AM - Dr. Smith logged in (IP: 192.168.1.1)
   - 10:05 AM - Created encounter #123
   - 10:10 AM - Uploaded audio
   - 10:15 AM - SOAP generated
   - 10:20 AM - Claim submitted
   - 2:00 PM - Claim approved
```

---

## 📊 Service Dependencies

### Critical Dependencies (Must work for system to function)
- **Cognito** ← All API requests need authentication
- **RDS** ← All data storage
- **KMS** ← All encryption
- **Secrets Manager** ← Database credentials

### Processing Dependencies (Needed for AI features)
- **Lambda** ← All AI processing
- **S3** ← Audio storage
- **Transcribe Medical** ← Audio to text
- **SQS** ← Reliable processing

### Compliance Dependencies (Required for HIPAA)
- **CloudTrail** ← Audit logging
- **AWS Backup** ← Data retention
- **KMS** ← Encryption

### Enhancement Dependencies (Improves experience)
- **SNS** ← Notifications
- **EventBridge** ← Automation
- **Comprehend Medical** ← Better accuracy
- **WAF** ← Security

---

## 💡 Simple Mental Model

Think of the system like a hospital:

- **Cognito** = Security desk (checks ID)
- **API Gateway** = Front door (controls entry)
- **WAF** = Security guards (stops attackers)
- **Backend API** = Doctors (do the work)
- **RDS** = Medical records room (stores data)
- **S3** = Storage closet (stores files)
- **Lambda** = Lab technicians (process samples)
- **SQS** = Waiting room (queues patients)
- **SNS** = Pager system (alerts staff)
- **KMS** = Safe (locks everything)
- **CloudTrail** = Security cameras (records everything)
- **CloudWatch** = Monitoring station (watches activity)
- **Transcribe Medical** = Transcriptionist (writes notes)
- **Comprehend Medical** = Medical coder (extracts codes)
- **EventBridge** = Scheduling system (automates tasks)
- **AWS Backup** = Backup generator (disaster recovery)

---

## 🎯 Key Takeaways

1. **Authentication:** Cognito → API Gateway → Backend
2. **Data Storage:** Backend → Secrets Manager → RDS/S3 (encrypted by KMS)
3. **AI Processing:** S3 → Lambda → Transcribe → Comprehend → Lambda → RDS
4. **Async Jobs:** Backend → SQS → Lambda
5. **Notifications:** EventBridge → Lambda → SNS
6. **Security:** WAF + Cognito + KMS + CloudTrail
7. **Backup:** AWS Backup → RDS + S3

**Everything connects through the Backend API, which orchestrates all services.**

---

## 📝 Next Steps

1. ✅ Core services already set up
2. 🔄 Add Lambda functions for AI processing
3. 🔄 Set up SQS queues
4. 🔄 Configure Transcribe Medical
5. 🔄 Enable CloudTrail
6. 🔄 Set up SNS notifications
7. 🔄 Configure AWS Backup
8. 🔄 Deploy WAF rules

See `AWS_ADDITIONAL_SERVICES.md` for setup commands!
