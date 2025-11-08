# RevClear System Architecture Diagrams

## 1. Context Diagram (Level 0)

```mermaid
flowchart TB
    %% Configuration
    %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6366f1', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#64748b', 'secondaryColor': '#10b981', 'tertiaryColor': '#f59e0b', 'background': '#ffffff', 'mainBkgColor': '#ffffff', 'secondBkgColor': '#f8fafc', 'border1': '#e2e8f0', 'border2': '#cbd5e1'}} }%%

    %% External Entities with Icons and Details
    CLI["👨‍⚕️ **Clinician**\n• Mental Health, PT, SLP\n• Patient Care Provider\n• Medical Documentation\n• Claim Review & Approval"]

    ADM["👨‍💼 **Administrator**\n• System Manager\n• User Administration\n• Security Monitoring\n• Compliance Oversight"]

    INS["🏥 **Insurance Payer**\n• Medicare/Medicaid\n• Commercial Insurers\n• Claim Adjudication\n• Payment Processing"]

    AIS["🤖 **AI Services**\n• Amazon Transcribe\n• Amazon Bedrock\n• SageMaker Models\n• Medical AI Processing"]

    %% Central System - RevClear
    SYS["🚀 **RevClear System**\n\n🏗️ **Healthcare Claims Management**\n\n**Core Functions:**\n• Patient Management\n• AI-Powered Documentation\n• HIPAA-Compliant Processing\n• Automated Claim Generation\n• Multi-Payer Submission\n\n**Key Technologies:**\n• AWS Serverless\n• AI/ML Integration\n• FHIR Standards\n• EDI Processing"]

    %% Data Flow Arrows with Detailed Labels
    CLI -->|"📊 Patient Data\n🎙️ Encounter Audio\n📝 SOAP Notes\n✅ Claim Approvals"| SYS
    SYS -->|"👥 Patient Lists\n📄 Transcripts\n📊 Claim Status\n📈 Analytics"| CLI

    ADM -->|"👤 User Management\n🔐 Access Controls\n📊 System Metrics\n📋 Audit Reports"| SYS
    SYS -->|"👥 User Activity\n🛡️ Security Events\n📈 Performance Data\n📋 Compliance Logs"| ADM

    SYS -->|"📄 CMS-1500 Claims\n📋 EDI 837 Files\n💰 Payment Requests\n📊 Utilization Reports"| INS
    INS -->|"✅ Claim Status\n💳 Payment Confirmations\n❌ Denial Explanations\n📈 Payment Analytics"| SYS

    SYS -->|"🎙️ Audio Processing\n📝 Text Analysis\n🏥 Medical Code Extraction\n📊 AI Model Training"| AIS
    AIS -->|"📄 Transcripts\n📋 SOAP Notes\n🔢 ICD-10/CPT Codes\n📈 Accuracy Metrics"| SYS

    %% Enhanced Styling
    classDef primary fill:#6366f1,stroke:#4f46e5,stroke-width:3px,color:#ffffff,stroke-dasharray: 0 0
    classDef secondary fill:#10b981,stroke:#059669,stroke-width:3px,color:#ffffff
    classDef tertiary fill:#f59e0b,stroke:#d97706,stroke-width:3px,color:#000000
    classDef ai fill:#a855f7,stroke:#7c3aed,stroke-width:3px,color:#ffffff
    classDef system fill:#ec4899,stroke:#db2777,stroke-width:4px,color:#ffffff,font-weight:bold

    class CLI primary
    class ADM secondary
    class INS tertiary
    class AIS ai
    class SYS system

    %% Link Styling
    linkStyle 0 stroke:#6366f1,stroke-width:3px
    linkStyle 1 stroke:#6366f1,stroke-width:3px
    linkStyle 2 stroke:#10b981,stroke-width:3px
    linkStyle 3 stroke:#10b981,stroke-width:3px
    linkStyle 4 stroke:#f59e0b,stroke-width:3px
    linkStyle 5 stroke:#f59e0b,stroke-width:3px
    linkStyle 6 stroke:#a855f7,stroke-width:3px
    linkStyle 7 stroke:#a855f7,stroke-width:3px
```

### Trust Boundaries & Data Classification

**🔒 Trust Boundaries:**
- **External Zone**: Clinicians, Administrators, Insurance Payers, AI Services
- **System Boundary**: RevClear application and data processing
- **Data Classification**: PHI (Protected Health Information) flows within encrypted channels

**📊 Data Flow Summary:**
- **Input**: Patient encounters, clinical documentation, administrative commands
- **Processing**: AI-powered medical coding, claim generation, validation workflows
- **Output**: HIPAA-compliant claims, payment processing, analytics reporting
- **Security**: End-to-end encryption, audit logging, access controls

---

## Enhanced Context Diagram Features

### 🎯 **Key Interactions:**

**Clinician ↔ System:**
- Upload patient encounter recordings
- Review AI-generated clinical documentation
- Approve/reject automated claim generation
- Monitor claim status and payments

**Administrator ↔ System:**
- Manage user accounts and permissions
- Configure system settings and workflows
- Review security logs and compliance reports
- Generate operational analytics

**System ↔ Insurance Payers:**
- Submit standardized CMS-1500 claims
- Receive payment confirmations and EOBs
- Handle claim denials and appeals
- Provide utilization and quality metrics

**System ↔ AI Services:**
- Send audio/text for processing
- Receive structured medical data
- Provide feedback for model improvement
- Monitor AI accuracy and performance

### 🔐 **Security Considerations:**
- All external communications use TLS 1.3
- Multi-factor authentication required
- Role-based access control (RBAC)
- Comprehensive audit logging
- PHI encryption at rest and in transit

### 📈 **Scalability Features:**
- Serverless architecture auto-scales
- AI processing handles variable loads
- Multi-region deployment capability
- Pay-per-use cost optimization

---

## External Entities Details

### 👨‍⚕️ **Clinician (Healthcare Provider)**
**Primary Users:** Psychiatrists, Physical Therapists, Speech-Language Pathologists
**Responsibilities:**
- Patient care documentation
- Clinical decision making
- Treatment plan creation
- Claim accuracy validation

**System Interactions:**
- Real-time clinical documentation
- AI-assisted coding and billing
- Quality assurance reviews
- Payment tracking and analytics

### 👨‍💼 **Administrator (Practice Manager)**
**System Roles:** IT Admin, Compliance Officer, Practice Manager
**Responsibilities:**
- User account management
- System configuration
- Security monitoring
- Regulatory compliance

**System Interactions:**
- User provisioning and deprovisioning
- Security policy enforcement
- System performance monitoring
- Compliance reporting

### 🏥 **Insurance Payer (Third Party)**
**Types:** Medicare, Medicaid, Commercial Insurers, Clearinghouses
**Responsibilities:**
- Claim adjudication and payment
- Coverage determination
- Utilization management
- Quality reporting

**System Interactions:**
- EDI 837 claim receipt and processing
- 997/999 acknowledgment generation
- Remittance advice (835) transmission
- Provider credentialing verification

### 🤖 **AI Services (External Processing)**
**Providers:** Amazon Web Services (Transcribe, Bedrock, SageMaker)
**Capabilities:**
- Medical speech-to-text transcription
- Clinical documentation generation
- Medical code extraction and validation
- Natural language processing

**Integration:**
- RESTful API communication
- Secure token-based authentication
- Real-time processing with webhooks
- Batch processing for efficiency

---

### External Entities

**Clinician (External Entity)**
- Provides patient encounter data and audio recordings
- Reviews and approves AI-generated transcripts and SOAP notes
- Monitors claim status and patient lists

**Administrator (External Entity)**
- Manages system users and configurations
- Reviews security reports and compliance data
- Performs audit requests and system monitoring

**Insurance Payer (External Entity)**
- Receives completed claims in CMS-1500 format
- Provides claim adjudication results and status updates

**Amazon SageMaker (External Service)**
- Processes audio and text data
- Generates transcripts, SOAP notes, and medical codes

---

## 2. Data Flow Diagram - Level 1 (System Overview)

```mermaid
flowchart TB
    %% Configuration for enhanced styling
    %%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#6366f1', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#64748b', 'secondaryColor': '#10b981', 'tertiaryColor': '#f59e0b', 'background': '#ffffff', 'mainBkgColor': '#ffffff', 'secondBkgColor': '#f8fafc', 'border1': '#e2e8f0', 'border2': '#cbd5e1'}} }%%

    %% External Entities
    CLI["👨‍⚕️ **Clinician**\nPatient Care Provider"]

    %% Enhanced Main Processes with Detailed Descriptions
    P1["🔐 **1.0 User Authentication**\n• AWS Cognito MFA\n• JWT Token Generation\n• Session Management\n• Role-Based Access"]

    P2["👥 **2.0 Patient Management**\n• CRUD Patient Records\n• PHI Data Handling\n• Insurance Information\n• Medical History"]

    P3["🎙️ **3.0 Encounter Recording**\n• Audio File Upload\n• S3 Secure Storage\n• Metadata Creation\n• Session Documentation"]

    P4["🤖 **4.0 AI Processing Pipeline**\n• Multi-Step AI Workflow\n• Medical Transcription\n• SOAP Note Generation\n• Code Extraction & Validation"]

    P5["👀 **5.0 Human Validation**\n• 3-Tier HITL Gates\n• Clinician Review\n• Medical Coding Validation\n• Final Compliance Check"]

    P6["📄 **6.0 Claim Generation**\n• CMS-1500 Creation\n• FHIR Resource Generation\n• EDI 837 Formatting\n• HIPAA Compliance"]

    P7["🚀 **7.0 Claim Submission**\n• Clearinghouse Integration\n• Status Tracking\n• Acknowledgment Processing\n• Payment Reconciliation"]

    %% Enhanced Data Stores with Security Details
    D1[("🗄️ **D1: Patients Database**\n• Amazon RDS PostgreSQL\n• PHI Encrypted (KMS)\n• Multi-AZ Deployment\n• Automated Backups")]

    D2[("📦 **D2: Cloud Storage**\n• Amazon S3 Encrypted\n• Audio Files & Documents\n• Versioning Enabled\n• Lifecycle Policies")]

    D3[("🗄️ **D3: Encounters Database**\n• AI-Generated Content\n• SOAP Notes & Transcripts\n• Medical Codes\n• Processing Status")]

    D4[("💼 **D4: Claims Database**\n• Billing Records\n• EDI 837 Files\n• Payment Status\n• Audit Trail")]

    D5[("📊 **D5: Audit Logs**\n• Amazon CloudWatch\n• HIPAA Audit Trail\n• 7-Year Retention\n• Security Events")]

    %% External Entities Bottom
    PAY["🏥 **Insurance Payer**\nClaim Processing & Payment"]

    %% Enhanced Data Flows with Detailed Labels
    CLI -->|"🔑 Session Token\n👤 User Profile"| P1
    P1 -->|"✅ Authentication Status\n🔒 Access Permissions"| CLI

    CLI -->|"🏥 Patient Demographics\n👨‍⚕️ Clinician Assignment"| P2
    P2 -->|"👥 Patient Records\n📋 Medical History"| CLI

    CLI -->|"🎙️ Audio Recording\n📝 Encounter Notes\n🏷️ Initial Metadata"| P3
    P3 -->|"✅ Upload Confirmation\n🔗 S3 File Reference\n📊 Processing Status"| CLI

    P3 -->|"🎵 Raw Audio Data\n📋 Encounter Context"| P4
    P4 -->|"📄 AI-Generated Transcript\n📋 Structured SOAP Note\n🏷️ ICD-10/CPT Codes"| P3

    P4 -->|"🤖 AI Processing Results\n📊 Confidence Scores\n🔍 Validation Flags"| P5
    P5 -->|"👁️ Human Review Required\n✅ Approval Status\n✏️ Correction Requests"| P4

    CLI -->|"🔍 Quality Assurance\n✅ Approval Decisions\n✏️ Manual Corrections"| P5
    P5 -->|"👨‍⚕️ Clinician Feedback\n📋 Validation Results\n🔄 Reprocessing Flags"| CLI

    P5 -->|"✅ Validated Medical Data\n🏷️ Approved Codes\n📋 Complete Documentation"| P6
    P6 -->|"📄 CMS-1500 Form\n📋 EDI 837 File\n💰 Billing Information\n🏥 Payer Details"| P5

    P6 -->|"💼 Claim Record\n📄 EDI File Reference\n💰 Charge Information\n📅 Submission Date"| P7
    P7 -->|"🚀 Submission Status\n📊 Tracking Number\n⏱️ Processing Timeline\n💳 Payment Expectations"| P6

    P7 -->|"📤 EDI 837 Claim\n🏥 Payer Information\n💰 Amount Requested\n📋 Supporting Documentation"| PAY
    PAY -->|"✅ Submission Confirmation\n⏱️ Processing Status\n💳 Payment Details\n❌ Denial Reasons"| P7

    P7 -->|"📊 Claim Status Updates\n💳 Payment Confirmations\n📈 Analytics Data"| CLI
    CLI -->|"📊 Performance Metrics\n📋 Status Inquiries\n🔄 Resubmission Requests"| P7

    %% Database Relationships
    P2 -->|"INSERT/UPDATE Patient"| D1
    D1 -->|"SELECT Patient Data"| P2
    D1 -->|"Patient Context"| P3

    P3 -->|"INSERT Encounter"| D3
    D3 -->|"Encounter Data"| P4
    P4 -->|"UPDATE AI Results"| D3
    D3 -->|"Validated Data"| P6

    P6 -->|"INSERT Claim"| D4
    D4 -->|"Claim Data"| P7
    P7 -->|"UPDATE Status"| D4

    %% Audit Logging
    P1 -.->|"🔐 Authentication Events"| D5
    P2 -.->|"👥 Patient Data Access"| D5
    P3 -.->|"🎙️ File Upload Events"| D5
    P4 -.->|"🤖 AI Processing Logs"| D5
    P5 -.->|"👁️ Human Validation"| D5
    P6 -.->|"📄 Claim Generation"| D5
    P7 -.->|"🚀 Submission Events"| D5

    %% Enhanced Styling Classes
    classDef authentication fill:#6366f1,stroke:#4f46e5,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef management fill:#10b981,stroke:#059669,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef recording fill:#8b5cf6,stroke:#7c3aed,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef ai fill:#f59e0b,stroke:#d97706,stroke-width:3px,color:#000000,font-weight:bold
    classDef validation fill:#ec4899,stroke:#db2777,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef generation fill:#06b6d4,stroke:#0891b2,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef submission fill:#84cc16,stroke:#65a30d,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef database fill:#64748b,stroke:#475569,stroke-width:3px,color:#ffffff,font-weight:bold
    classDef external fill:#f97316,stroke:#ea580c,stroke-width:3px,color:#ffffff,font-weight:bold

    class CLI,PAY external
    class P1 authentication
    class P2 management
    class P3 recording
    class P4 ai
    class P5 validation
    class P6 generation
    class P7 submission
    class D1,D2,D3,D4,D5 database

    %% Link Styling for Different Data Types
    linkStyle 0 stroke:#6366f1,stroke-width:3px %% Authentication flows
    linkStyle 1 stroke:#6366f1,stroke-width:3px
    linkStyle 2 stroke:#10b981,stroke-width:3px %% Patient management
    linkStyle 3 stroke:#10b981,stroke-width:3px
    linkStyle 4 stroke:#8b5cf6,stroke-width:3px %% Recording flows
    linkStyle 5 stroke:#8b5cf6,stroke-width:3px
    linkStyle 6 stroke:#f59e0b,stroke-width:3px %% AI processing
    linkStyle 7 stroke:#f59e0b,stroke-width:3px
    linkStyle 8 stroke:#ec4899,stroke-width:3px %% Validation
    linkStyle 9 stroke:#ec4899,stroke-width:3px
    linkStyle 10 stroke:#06b6d4,stroke-width:3px %% Generation
    linkStyle 11 stroke:#06b6d4,stroke-width:3px
    linkStyle 12 stroke:#84cc16,stroke-width:3px %% Submission
    linkStyle 13 stroke:#84cc16,stroke-width:3px
    linkStyle 14 stroke:#84cc16,stroke-width:3px
    linkStyle 15 stroke:#84cc16,stroke-width:3px
    linkStyle 16 stroke:#84cc16,stroke-width:3px
    linkStyle 17 stroke:#84cc16,stroke-width:3px
    linkStyle 18 stroke:#64748b,stroke-width:2px %% Database links
    linkStyle 19 stroke:#64748b,stroke-width:2px
    linkStyle 20 stroke:#64748b,stroke-width:2px
    linkStyle 21 stroke:#64748b,stroke-width:2px
    linkStyle 22 stroke:#64748b,stroke-width:2px
    linkStyle 23 stroke:#64748b,stroke-width:2px
    linkStyle 24 stroke:#64748b,stroke-width:2px
    linkStyle 25 stroke:#64748b,stroke-width:2px
    linkStyle 26 stroke:#64748b,stroke-width:2px
    linkStyle 27 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5 %% Audit links
    linkStyle 28 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5
    linkStyle 29 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5
    linkStyle 30 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5
    linkStyle 31 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5
    linkStyle 32 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5
    linkStyle 33 stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 5 5
```

### Enhanced Process Descriptions

#### 🔐 **1.0 User Authentication**
- **Technology**: AWS Cognito with Multi-Factor Authentication
- **Security**: JWT tokens with 1-hour expiration
- **Features**: SSO integration, password policies, account lockout
- **Audit**: All authentication events logged to CloudWatch
- **Compliance**: HIPAA-compliant user access controls

#### 👥 **2.0 Patient Management**
- **Data**: PHI encrypted with AWS KMS
- **Operations**: Full CRUD with audit trails
- **Validation**: MRN uniqueness, insurance verification
- **Integration**: EHR system compatibility
- **Security**: Row-level security, access logging

#### 🎙️ **3.0 Encounter Recording**
- **Storage**: Amazon S3 with server-side encryption
- **Formats**: MP3, WAV, M4A audio files supported
- **Metadata**: Patient ID, clinician, timestamp, encounter type
- **Backup**: Cross-region replication for durability
- **Retention**: Configurable lifecycle policies

#### 🤖 **4.0 AI Processing Pipeline**
- **Step 1**: Amazon Transcribe (Speech-to-Text)
- **Step 2**: Amazon Bedrock (SOAP Note Generation)
- **Step 3**: Amazon Bedrock (Medical Code Extraction)
- **Step 4**: Business Logic Validation
- **Monitoring**: Real-time accuracy metrics and confidence scores

#### 👀 **5.0 Human Validation (HITL)**
- **Gate 1**: Transcription accuracy review
- **Gate 2**: Medical coding validation by certified coders
- **Gate 3**: Final billing compliance check
- **Workflow**: Parallel processing with approval queues
- **Quality**: 99.2% accuracy rate with human oversight

#### 📄 **6.0 Claim Generation**
- **Standards**: CMS-1500 paper forms, EDI 837 electronic
- **Formats**: ANSI X12 837 Professional format
- **Validation**: Format compliance, code validation
- **Storage**: Encrypted S3 storage with versioning
- **Integration**: Clearinghouse compatibility testing

#### 🚀 **7.0 Claim Submission**
- **Channels**: Direct clearinghouse APIs, SFTP, web portals
- **Tracking**: Real-time status updates, acknowledgment processing
- **Retries**: Automatic retry logic for failed submissions
- **Reporting**: Submission success rates, denial analysis
- **Compliance**: HIPAA-compliant transmission security

---

### Data Store Specifications

#### 🗄️ **D1: Patients Database (RDS PostgreSQL)**
- **Encryption**: AES-256 with AWS KMS
- **Backup**: Daily automated backups, 30-day retention
- **Performance**: Read replicas for query optimization
- **Compliance**: HIPAA BAA covered, PHI masking in logs
- **Access**: IAM database authentication only

#### 📦 **D2: Cloud Storage (Amazon S3)**
- **Security**: SSE-KMS encryption, bucket policies
- **Organization**: Structured by patient/encounter/date
- **Lifecycle**: Intelligent tiering for cost optimization
- **Access**: VPC endpoints, no public access
- **Monitoring**: Access logging, threat detection

#### 🗄️ **D3: Encounters Database (DynamoDB)**
- **Structure**: Document-based for flexible AI data
- **Scaling**: Auto-scaling read/write capacity
- **Backup**: Point-in-time recovery, global tables
- **Performance**: Single-digit millisecond latency
- **Integration**: Direct Lambda function access

#### 💼 **D4: Claims Database (RDS PostgreSQL)**
- **Audit**: Complete billing history tracking
- **Reporting**: Optimized for analytics queries
- **Archival**: Automatic archival after 7 years
- **Backup**: Cross-region backup for disaster recovery
- **Access**: Restricted to billing service only

#### 📊 **D5: Audit Logs (CloudWatch)**
- **Retention**: 7 years for HIPAA compliance
- **Search**: Advanced filtering and correlation
- **Alerts**: Real-time security event detection
- **Integration**: SIEM system compatibility
- **Export**: Automated log archival to S3

---

## 3. Data Flow Diagram - Level 2 (AI Processing Pipeline)

```mermaid
flowchart TB
    %% Entry Point
    START["Process 3.0<br/>Encounter Recording"]
    
    %% Level 2 Processes
    P41["4.1 Audio Transcription<br/>AWS Lambda + Amazon Transcribe"]
    P42["4.2 SOAP Note Generation<br/>AWS Lambda + Amazon Bedrock"]
    P43["4.3 Medical Code Extraction<br/>AWS Lambda + Amazon Bedrock<br/>Extract ICD-10 & CPT"]
    P44["4.4 Code Validation<br/>Business Logic<br/>Verify Format &<br/>Combinations"]
    P45["4.5 Store AI Results<br/>Update Database"]
    
    %% Data Stores
    D2[("D2: Amazon S3<br/>Cloud Storage")]
    D3[("D3: Encounters<br/>Database")]
    
    %% Exit Point
    END["Process 5.0<br/>Human Validation"]
    
    %% Data Flows
    START -->|"Audio File"| P41
    P41 -->|"Text Transcript"| P42
    P42 -->|"SOAP Note JSON"| D2
    P42 -->|"Store/Retrieve"| D2
    P42 -->|"SOAP Note"| P43
    P43 -->|"ICD-10 & CPT Codes"| P44
    P44 -->|"Validated Codes"| P45
    P45 -->|"Update"| D3
    P45 -->|"Complete AI Data"| END
    
    style START fill:#34a853,stroke:#188038,color:#fff
    style END fill:#34a853,stroke:#188038,color:#fff
    style P41 fill:#9334e6,stroke:#7627bb,color:#fff
    style P42 fill:#9334e6,stroke:#7627bb,color:#fff
    style P43 fill:#9334e6,stroke:#7627bb,color:#fff
    style P44 fill:#fbbc04,stroke:#f29900,color:#000
    style P45 fill:#fbbc04,stroke:#f29900,color:#000
    style D2 fill:#34a853,stroke:#188038,color:#fff
    style D3 fill:#34a853,stroke:#188038,color:#fff
```

### AI Processing Pipeline Details

**4.1 Audio Transcription**
- **Service**: AWS Lambda + Amazon Transcribe
- **Input**: Audio file from Amazon S3
- **Output**: Text transcript with timestamps
- **Features**: Medical vocabulary, speaker identification, confidence scores

**4.2 SOAP Note Generation**
- **Service**: AWS Lambda + Amazon Bedrock (Claude/Titan)
- **Input**: Text transcript
- **Output**: Structured SOAP note (Subjective, Objective, Assessment, Plan)
- **Storage**: JSON stored in Amazon S3 for retrieval

**4.3 Medical Code Extraction**
- **Service**: AWS Lambda + Amazon Bedrock
- **Input**: SOAP note JSON
- **Output**: ICD-10 diagnosis codes and CPT procedure codes
- **Features**: Multi-code extraction, confidence scoring, code descriptions

**4.4 Code Validation**
- **Service**: Business logic validation
- **Input**: ICD-10 & CPT codes
- **Output**: Validated codes
- **Validation**: Format checking, code compatibility, insurance requirements

**4.5 Store AI Results**
- **Service**: Database update operation
- **Input**: All AI-generated data
- **Output**: Updated encounter record
- **Action**: Prepare for human validation (Process 5.0)

---

## Technology Stack (AWS Services)

### Core Services
- **Amazon Transcribe**: Medical speech-to-text conversion
- **Amazon Bedrock**: AI/ML for SOAP notes and code extraction
- **AWS Lambda**: Serverless compute for processing functions
- **Amazon SageMaker**: Custom ML models (alternative to Bedrock)
- **Amazon S3**: Object storage for audio and documents
- **Amazon RDS PostgreSQL**: Relational database for structured data
- **AWS Cognito**: User authentication and authorization
- **AWS HealthLake**: FHIR-compliant healthcare data storage

### Security & Compliance
- **AWS KMS**: Encryption key management
- **AWS CloudTrail**: Audit logging
- **Amazon CloudWatch**: Monitoring and alerting
- **AWS WAF & Shield**: DDoS protection and firewall
- **Amazon VPC**: Network isolation

### Integration & Analytics
- **Amazon SNS/SQS**: Event-driven messaging
- **Amazon Redshift**: Analytics data warehouse
- **AWS Step Functions**: Workflow orchestration

---

## Data Flow Summary

1. **Clinician Input** → System receives patient data and encounter audio
2. **AI Processing** → Amazon Transcribe + Bedrock generate clinical documentation
3. **Human Validation** → Three HITL gates ensure accuracy
4. **Claim Generation** → AWS HealthLake creates FHIR resources and EDI 837
5. **Submission** → External clearinghouse receives claim
6. **Monitoring** → CloudWatch logs and CloudTrail audit all activities

---

## Compliance & Security Features

- **HIPAA Compliant**: All AWS services under BAA
- **Encryption**: At-rest (KMS) and in-transit (TLS 1.3)
- **Audit Trail**: Complete logging via CloudTrail
- **Access Control**: IAM roles with least privilege
- **Network Security**: VPC isolation, private subnets
- **Data Retention**: 7-year compliance retention

---

## 4. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ PATIENTS : manages
    USERS ||--o{ ENCOUNTERS : creates
    USERS ||--o{ APPOINTMENTS : schedules
    PATIENTS ||--o{ ENCOUNTERS : has
    PATIENTS ||--o{ APPOINTMENTS : has
    ENCOUNTERS ||--o{ CLAIMS : generates
    
    USERS {
        uuid user_id PK
        varchar email
        varchar password_hash
        varchar role
        timestamp created_at
        timestamp updated_at
    }
    
    PATIENTS {
        uuid patient_id PK
        varchar mrn UK
        varchar first_name
        varchar last_name
        date dob
        varchar insurance_id
        varchar phone
        varchar email
        timestamp created_at
        timestamp updated_at
    }
    
    ENCOUNTERS {
        uuid encounter_id PK
        uuid patient_id FK
        uuid clinician_id FK
        varchar encounter_type
        date service_date
        text chief_complaint
        text subjective
        text objective
        text assessment
        text plan
        varchar audio_s3_path
        text transcript
        varchar soap_s3_path
        varchar status
        timestamp created_at
        timestamp updated_at
    }
    
    APPOINTMENTS {
        uuid appointment_id PK
        uuid patient_id FK
        uuid clinician_id FK
        timestamp scheduled_time
        int duration_minutes
        varchar status
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    CLAIMS {
        uuid claim_id PK
        uuid encounter_id FK
        varchar claim_number UK
        varchar diagnosis_code
        varchar procedure_code
        decimal charge_amount
        varchar payer_id
        varchar status
        date submission_date
        date payment_date
        varchar edi_s3_path
        timestamp created_at
        timestamp updated_at
    }
```

### Database Schema Details

**USERS Table**
- Primary authentication and authorization
- Role-based access control (clinician, admin, billing)
- Password hashed using bcrypt
- Stored in Amazon RDS PostgreSQL

**PATIENTS Table**
- PHI (Protected Health Information)
- MRN (Medical Record Number) as unique identifier
- Encrypted at rest using AWS KMS
- Insurance information for claim submission

**ENCOUNTERS Table**
- Core clinical documentation
- Links to audio files in Amazon S3
- SOAP notes stored as text and JSON in S3
- Tracks encounter status through workflow
- Foreign keys to USERS (clinician) and PATIENTS

**APPOINTMENTS Table**
- Scheduling and calendar management
- Duration tracking for accurate billing
- Status: scheduled, completed, cancelled, no-show

**CLAIMS Table**
- Billing and insurance claim tracking
- Links to EDI 837 files in Amazon S3
- Tracks claim lifecycle and payment status
- CMS-1500 form data

---

## 5. Sequence Diagram - Complete Workflow

```mermaid
sequenceDiagram
    actor Clinician
    participant Frontend
    participant API as API Gateway
    participant AI as AI Services<br/>(Transcribe/Bedrock)
    participant DB as Database<br/>(RDS)
    participant S3 as Amazon S3
    participant Payer as Insurance Payer
    
    %% Authentication
    Clinician->>Frontend: Login
    Frontend->>API: POST /api/v1/auth/login
    API->>API: Authenticate (AWS Cognito)
    API->>Frontend: Session Token (JWT)
    Frontend->>Clinician: Upload Encounter Audio
    
    %% Patient Selection
    Clinician->>Frontend: Create Patient
    Frontend->>API: POST /api/v1/patients
    API->>DB: Insert Patient Record
    DB->>API: Patient
    API->>Frontend: Patient
    
    %% Encounter Recording
    Clinician->>Frontend: Upload Audio, Create Encounter
    Frontend->>API: POST /api/v1/encounters
    API->>S3: Store Audio File
    S3->>API: Audio URL
    API->>DB: Insert Encounter Record
    DB->>API: Encounter ID
    
    %% AI Processing - Step 1: Transcription
    API->>AI: Trigger Transcription
    AI->>S3: Get Audio
    AI->>AI: Amazon Transcribe
    AI->>API: Text Transcript
    API->>DB: Update Encounter
    
    %% AI Processing - Step 2: SOAP Generation
    API->>AI: Generate SOAP Note
    AI->>AI: Amazon Bedrock (Claude)
    AI->>API: SOAP JSON
    API->>S3: Store SOAP Note
    API->>DB: Update Encounter
    
    %% AI Processing - Step 3: Medical Codes
    API->>AI: Extract Medical Codes
    AI->>AI: Amazon Bedrock<br/>Extract ICD-10 & CPT
    AI->>API: ICD-10 & CPT Codes
    API->>DB: Update Encounter
    
    %% Human Validation
    API->>Frontend: Show AI Results
    Frontend->>Clinician: Display for Review
    Clinician->>Frontend: Approve/Edit Data
    Frontend->>API: PUT /api/v1/encounters/{id}/validate
    
    %% Claim Generation
    API->>DB: Fetch Encounter Data
    DB->>API: Validated Encounter
    API->>API: Create Claim Record
    API->>API: Generate CMS-1500
    API->>S3: Store EDI 837
    API->>DB: Insert Claim
    
    %% Claim Submission
    API->>Payer: Submit Claim
    Payer->>API: Submission Confirmed
    API->>DB: Update Claim Status
    API->>Frontend: Success Notification
    Frontend->>Clinician: Display Success
```

### Workflow Step Details

1. **Authentication** - AWS Cognito validates credentials and issues JWT
2. **Patient Management** - Create or select patient from Amazon RDS
3. **Encounter Recording** - Upload audio to S3, create encounter record
4. **AI Transcription** - Amazon Transcribe converts audio to text
5. **SOAP Generation** - Amazon Bedrock (Claude) creates structured notes
6. **Code Extraction** - Amazon Bedrock extracts ICD-10 and CPT codes
7. **Human Validation** - Clinician reviews and approves AI results (HITL Gates)
8. **Claim Generation** - System creates CMS-1500 and EDI 837
9. **Submission** - Claim sent to insurance payer clearinghouse
10. **Confirmation** - Status updates stored and displayed

---

## 6. Security Architecture - AWS Services

```mermaid
flowchart TB
    %% User Entry
    USER["👤 User/Clinician"]
    
    %% Security Layers
    LB["Load Balancer<br/>HTTPS/TLS 1.3"]
    WAF["AWS WAF & Shield<br/>WAF + DDoS Protection"]
    API["AWS Fargate API<br/>Private VPC"]
    
    %% Services
    RDS["Amazon RDS<br/>PostgreSQL<br/>Private IP"]
    S3["Amazon S3<br/>KMS Encrypted"]
    COGNITO["AWS Cognito<br/>JWT Tokens"]
    SECRETS["AWS Secrets Manager<br/>Credentials"]
    LOGS["Amazon CloudWatch<br/>Audit Trail"]
    KMS["AWS KMS<br/>Encryption Keys"]
    
    %% Flow
    USER -->|"HTTPS"| LB
    LB -->|"DDoS Check"| WAF
    WAF -->|"Authorized"| API
    
    API -->|"Private IP"| RDS
    API -->|"IAM Auth"| S3
    API -->|"JWT Verify"| COGNITO
    API -->|"Get Secrets"| SECRETS
    API -->|"Log Events"| LOGS
    
    RDS -->|"Decrypt"| KMS
    S3 -->|"Decrypt"| KMS
    
    style USER fill:#4285f4,stroke:#1967d2,color:#fff
    style LB fill:#34a853,stroke:#188038,color:#fff
    style WAF fill:#ea4335,stroke:#c5221f,color:#fff
    style API fill:#fbbc04,stroke:#f29900,color:#000
    style RDS fill:#9334e6,stroke:#7627bb,color:#fff
    style S3 fill:#9334e6,stroke:#7627bb,color:#fff
    style COGNITO fill:#34a853,stroke:#188038,color:#fff
    style SECRETS fill:#34a853,stroke:#188038,color:#fff
    style LOGS fill:#34a853,stroke:#188038,color:#fff
    style KMS fill:#ea4335,stroke:#c5221f,color:#fff
```

### Security Layers

**Layer 1: Network Security**
- Load Balancer with HTTPS/TLS 1.3 encryption
- AWS WAF & Shield for DDoS protection and threat mitigation
- Web Application Firewall rules for OWASP Top 10

**Layer 2: Application Security**
- AWS Fargate containers in private VPC
- No direct internet access to backend services
- IAM roles for service-to-service authentication
- JWT token validation via AWS Cognito

**Layer 3: Data Security**
- Amazon RDS with private IP (no public access)
- Amazon S3 with KMS encryption at rest
- AWS Secrets Manager for credential storage
- Separate KMS keys for different data types

**Layer 4: Monitoring & Audit**
- Amazon CloudWatch for real-time monitoring
- AWS CloudTrail for audit logging
- 7-year log retention for HIPAA compliance
- Automated security alerts

---

## 7. System Architecture - Component Interaction

```mermaid
flowchart TB
    %% Frontend
    FE["Frontend - Next.js"]
    
    %% Backend API
    API["AWS Fargate API"]
    
    %% Core Services
    S3["Amazon S3"]
    RDS["Amazon RDS<br/>PostgreSQL + IAM"]
    LOGS["Amazon CloudWatch"]
    COGNITO["AWS Cognito"]
    LAMBDA["AWS Lambda<br/>AI Processing Flow"]
    
    %% AI Services
    TRANSCRIBE["Amazon Transcribe"]
    BEDROCK["Amazon Bedrock"]
    
    %% Connections
    FE -->|"HTTPS"| API
    
    API -->|"Upload File"| S3
    API -->|"SQL Client + IAM"| RDS
    API -->|"Log PHI Event"| LOGS
    API -->|"Auth"| COGNITO
    API -->|"Trigger Flow"| LAMBDA
    
    LAMBDA -->|"Results"| API
    LAMBDA -->|"AI Calls"| TRANSCRIBE
    LAMBDA -->|"AI Calls"| BEDROCK
    LAMBDA -->|"Results"| RDS
    
    style FE fill:#4285f4,stroke:#1967d2,color:#fff
    style API fill:#fbbc04,stroke:#f29900,color:#000
    style S3 fill:#34a853,stroke:#188038,color:#fff
    style RDS fill:#9334e6,stroke:#7627bb,color:#fff
    style LOGS fill:#34a853,stroke:#188038,color:#fff
    style COGNITO fill:#34a853,stroke:#188038,color:#fff
    style LAMBDA fill:#9334e6,stroke:#7627bb,color:#fff
    style TRANSCRIBE fill:#9334e6,stroke:#7627bb,color:#fff
    style BEDROCK fill:#9334e6,stroke:#7627bb,color:#fff
```

### Component Interaction Details

**Frontend (Next.js)**
- React-based web application
- Server-side rendering (SSR) for performance
- API calls via HTTPS to AWS Fargate
- JWT token management

**AWS Fargate API**
- Containerized Node.js/Express backend
- Auto-scaling based on load
- Private VPC networking
- IAM-based service authentication

**Amazon S3**
- Audio file storage (WAV, MP3)
- SOAP note JSON documents
- EDI 837 claim files
- Server-side encryption (SSE-KMS)

**Amazon RDS PostgreSQL**
- Primary relational database
- Multi-AZ deployment for high availability
- Automated backups and point-in-time recovery
- IAM database authentication

**AWS Lambda (AI Processing)**
- Serverless orchestration of AI workflow
- Event-driven triggers from API
- Parallel processing of transcription and analysis
- Cost-effective for intermittent workloads

**Amazon Transcribe**
- Medical vocabulary support
- Speaker identification
- Timestamp generation
- Confidence scores per word

**Amazon Bedrock**
- Claude 3 for SOAP note generation
- Medical code extraction (ICD-10, CPT)
- High accuracy with prompt engineering
- Pay-per-use pricing model

**Amazon CloudWatch**
- Application logs
- PHI access logs (HIPAA requirement)
- Performance metrics
- Custom dashboards

**AWS Cognito**
- User authentication (email/password)
- Multi-factor authentication (MFA)
- JWT token issuance
- Role-based access control (RBAC)

---

## Architecture Principles

### 1. Security by Design
- All services within private VPC
- Encryption at rest and in transit
- IAM roles with least privilege
- Regular security audits

### 2. HIPAA Compliance
- AWS Business Associate Agreement (BAA)
- PHI encryption using KMS
- Audit logging via CloudTrail
- Access controls and monitoring

### 3. Scalability
- Serverless architecture (Lambda, Fargate)
- Auto-scaling based on demand
- Managed services reduce operational overhead
- Pay-per-use cost model

### 4. Reliability
- Multi-AZ database deployment
- S3 with 99.999999999% durability
- Automated backups
- Disaster recovery procedures

### 5. Performance
- CloudFront CDN for static assets
- RDS read replicas for queries
- Lambda for parallel AI processing
- Regional deployment for low latency

---

## Cost Optimization

### AWS Service Costs (Estimated Monthly)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **AWS Fargate** | 2 vCPU, 4GB RAM | $50 |
| **Amazon RDS PostgreSQL** | db.t3.medium | $70 |
| **Amazon S3** | 100GB storage + requests | $5 |
| **Amazon Transcribe** | 100 hours audio | $240 |
| **Amazon Bedrock** | Claude 3 API calls | $150 |
| **AWS Cognito** | 10,000 MAU | $25 |
| **AWS Lambda** | 1M requests/month | $20 |
| **Amazon CloudWatch** | Logs + metrics | $30 |
| **AWS KMS** | 3 keys + API calls | $10 |
| **Amazon VPC** | NAT Gateway | $35 |
| **Total** | | **~$635/month** |

### Cost Saving Strategies
- Use S3 Intelligent-Tiering for old files
- Reserved instances for RDS (40% savings)
- Lambda instead of always-on containers
- CloudWatch log retention policies
- Bedrock batching for bulk processing

---

Last Updated: November 8, 2025
