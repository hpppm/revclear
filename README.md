# **RevClear**

AI-assisted medical claims and speech transcription platform for secure healthcare billing workflows.

---

## **Security Framework Baseline**

We apply part of the required controls from:  
- **HIPAA** – encrypted storage and protection of PHI/PII  
- **NIST CSF** – Protect, Detect, Respond, Recover across system lifecycle  
- **OWASP API Security** – secure API communication and prevent common API risks  


---

## **Platform Overview**

### 🔐 **Authentication**
- Amazon Cognito for secure user identity
- JWT-based API authentication

### 👤 **Access Control**
- IAM roles for tenant separation
- **RBAC currently enforced**  

### 🗄️ **Data Storage**
- Encrypted medical + billing data in **AWS RDS (PostgreSQL)**

### 📦 **File Storage**
- Encrypted transcripts and audio files in **Amazon S3**

### 🤖 **External AI Processing**
- **Genkit AI runs outside our environment**  
- local python whisper
- Restricted with encrypted data handling and vendor controls

### 🔍 **Audit Logging**
- System events logged through **AWS CloudTrail**
- API + middleware logs monitored via **AWS CloudWatch**

### 🔒 **Encryption**
- All data encrypted using **AWS KMS**
- RDS + S3 encrypted at rest (AES-256)

---

## **Environment Variables**

Required variables:
- `AWS_ACCOUNT_ID`
- `S3_MAIN_BUCKET`
- `COGNITO_USER_POOL_ID`
- `RDS_ENDPOINT` (PostgreSQL)
- `API_GATEWAY_ID`
