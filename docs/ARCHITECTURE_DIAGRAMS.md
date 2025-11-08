# RevClear System Architecture Diagrams

## 1. Context Diagram (Level 0)

```mermaid
flowchart TB
    %% External Entities
    CLI["👤 Clinician<br/>External Entity"]
    ADM["👨‍💼 Administrator<br/>External Entity"]
    INS["🏥 Insurance Payer<br/>External Entity"]
    AI["🤖 Amazon SageMaker<br/>External Service"]
    
    %% Central System
    SYS["RevClear System<br/>Healthcare Claims<br/>Management Platform"]
    
    %% Clinician Flows
    CLI -->|"Patient Data<br/>Encounter Audio<br/>SOAP Review"| SYS
    SYS -->|"Patient List<br/>Transcripts<br/>Claim Status"| CLI
    
    %% Administrator Flows
    SYS -->|"System Metrics<br/>Security Reports<br/>Compliance Data"| ADM
    ADM -->|"User Management<br/>Configuration<br/>Audit Requests"| SYS
    
    %% Insurance Payer Flows
    SYS -->|"Completed Claims<br/>CMS-1500 Format"| INS
    INS -->|"Claim Status<br/>Adjudication Results"| SYS
    
    %% AI Service Flows
    SYS -->|"Audio/Text<br/>Processing Requests"| AI
    AI -->|"Transcripts<br/>SOAP Notes<br/>Medical Codes"| SYS
    
    style CLI fill:#4285f4,stroke:#1967d2,color:#fff
    style ADM fill:#4285f4,stroke:#1967d2,color:#fff
    style INS fill:#4285f4,stroke:#1967d2,color:#fff
    style AI fill:#9334e6,stroke:#7627bb,color:#fff
    style SYS fill:#34a853,stroke:#188038,color:#fff
```

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
    %% External Entities
    CLI["👤 Clinician"]
    
    %% Main Processes
    P1["1.0 User Authentication<br/>AWS Cognito + Auth"]
    P2["2.0 Patient Management<br/>Create, Read, Update"]
    P3["3.0 Encounter Recording<br/>Upload Audio, Create<br/>Encounter"]
    P4["4.0 AI Processing Pipeline<br/>Transcribe, SOAP, Codes"]
    P5["5.0 Human Validation<br/>Review & Approval"]
    P6["6.0 Claim Generation<br/>Create CMS-1500"]
    P7["7.0 Claim Submission<br/>Send to Clearinghouse"]
    
    %% Data Stores
    D1[("D1: Patients<br/>Database")]
    D2[("D2: Cloud<br/>Storage<br/>(Amazon S3)")]
    D3[("D3: Encounters<br/>Database")]
    D4[("D4: Claims<br/>Database")]
    D5[("D5: Audit Logs<br/>(CloudWatch)")]
    
    %% External Entities Bottom
    PAY["🏥 Insurance Payer"]
    
    %% Flows from Clinician
    CLI -->|"Patient Data"| P2
    CLI -->|"Authenticated Session"| P1
    P1 -->|"Patient Record"| P3
    
    %% Patient Management
    P2 -->|"Patient"| D1
    D1 -->|"Patient"| P2
    P2 -->|"Patient"| P3
    
    %% Encounter Recording
    P3 -->|"Audio File"| D2
    P3 -->|"Encounter Record"| D3
    D2 -->|"Audio Retrieved"| P4
    D3 -->|"Encounter Record"| P4
    
    %% AI Processing
    P4 -->|"AI Results"| P5
    P4 -->|"Validated Data"| D3
    
    %% Human Validation
    P5 -->|"Review Data"| CLI
    CLI -->|"Reviewed Data"| P5
    P5 -->|"Claim Data"| P6
    
    %% Claim Generation
    P6 -->|"Claim Data"| D4
    D4 -->|"Claim Data"| P7
    
    %% Claim Submission
    P7 -->|"Submit Data"| PAY
    PAY -->|"Status"| P7
    P7 -->|"Status"| CLI
    
    %% Audit Logging
    P1 -.->|"Log"| D5
    P3 -.->|"Log"| D5
    P4 -.->|"Log"| D5
    P5 -.->|"Log"| D5
    P6 -.->|"Log"| D5
    P7 -.->|"Log"| D5
    
    style CLI fill:#4285f4,stroke:#1967d2,color:#fff
    style PAY fill:#4285f4,stroke:#1967d2,color:#fff
    style P1 fill:#fbbc04,stroke:#f29900,color:#000
    style P2 fill:#fbbc04,stroke:#f29900,color:#000
    style P3 fill:#fbbc04,stroke:#f29900,color:#000
    style P4 fill:#9334e6,stroke:#7627bb,color:#fff
    style P5 fill:#fbbc04,stroke:#f29900,color:#000
    style P6 fill:#fbbc04,stroke:#f29900,color:#000
    style P7 fill:#fbbc04,stroke:#f29900,color:#000
    style D1 fill:#34a853,stroke:#188038,color:#fff
    style D2 fill:#34a853,stroke:#188038,color:#fff
    style D3 fill:#34a853,stroke:#188038,color:#fff
    style D4 fill:#34a853,stroke:#188038,color:#fff
    style D5 fill:#34a853,stroke:#188038,color:#fff
```

### Process Descriptions

**1.0 User Authentication**
- AWS Cognito authentication with MFA
- Session management and token generation
- Role-based access control

**2.0 Patient Management**
- CRUD operations for patient records
- HIPAA-compliant data storage
- Patient search and filtering

**3.0 Encounter Recording**
- Audio file upload to Amazon S3
- Encounter metadata creation
- Session documentation

**4.0 AI Processing Pipeline**
- Audio transcription via Amazon Transcribe
- SOAP note generation via Amazon Bedrock
- Medical code extraction (ICD-10, CPT)

**5.0 Human Validation**
- Clinician review of AI results
- Approval workflow (3 HITL gates)
- Manual corrections and edits

**6.0 Claim Generation**
- CMS-1500 form creation
- FHIR resource generation via AWS HealthLake
- EDI 837 formatting

**7.0 Claim Submission**
- Submission to external clearinghouse
- Status tracking and monitoring
- 997/999 acknowledgment processing

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
