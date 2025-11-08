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

Last Updated: November 8, 2025
