# RevClear - Healthcare Claims Management System

> **Academic Project** | Cloud Architecture & Full-Stack Development Demonstration  
> **Student Portfolio Project** - Learning AWS, HIPAA Compliance, and Healthcare IT

**Live Interactive Demo**: https://hpppm.github.io/revclear/

---

## 🎓 Project Overview

This is a **student demonstration project** showcasing my skills in:
- ☁️ **AWS Cloud Architecture** - Designing HIPAA-compliant infrastructure
- 🔐 **Healthcare IT Security** - Understanding medical data protection
- ⚛️ **Full-Stack Development** - Next.js, React, Node.js, TypeScript
- 🏗️ **Infrastructure as Code** - Terraform, AWS services
- 📊 **System Design** - Architecture diagrams, documentation, threat modeling

**⚠️ Disclaimer**: This is a learning project, not a production medical billing system. It demonstrates technical concepts and AWS infrastructure design for educational purposes.

---

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/hpppm/revclear.git
cd revclear

# Backend
cd RevClear/backend
npm install
npm run dev

# Frontend
cd RevClear/frontend
npm install
npm run dev

# Terraform (infrastructure)
cd terraform
terraform init
terraform plan
```

---

## 📦 Current AWS Infrastructure

### ✅ Deployed Resources

**Security**
- 🔐 KMS Key: `4ed14e...` (AES-256 encryption, HIPAA-compliant)

**Databases (DynamoDB)**
- 🗄️ `physical_therapy_patients` (5 records, encrypted, PITR enabled)
- 🗄️ `speech_therapy_patients` (5 records, encrypted, PITR enabled)
- 🗄️ `mental_health_patients` (5 records, encrypted, PITR enabled)

**Storage (S3 Buckets)**
- 📦 `arevclear` - Main application data
- 📦 `arevclear-raw` - Intake/raw data
- 📦 `arevclear-exports` - EDI 837 files
- 📦 `arevclear-logs` - CloudTrail logs

**Monitoring**
- 📊 CloudTrail: `RevClearTrail` (multi-region, log validation enabled)

**Frontend (Temporary)**
- 🌐 AWS Amplify: `app2100`
- 🔗 URL: https://d1hbslcew3u3eg.amplifyapp.com

**💰 Cost**: ~$35/month

---

## 🎯 Learning Journey & Next Steps

### ✅ Completed (What I've Learned)
- **Phase 1: HIPAA Infrastructure** - Deployed KMS encryption, DynamoDB, S3, CloudTrail
- **Security & Compliance** - Implemented AWS security best practices
- **System Design** - Created C4 Model architecture diagrams, DFD, ERD, Sequence diagrams
- **Threat Modeling** - Completed STRIDE analysis for healthcare data
- **Documentation** - Professional technical documentation and cost analysis

### 🔄 Currently Learning
- **AWS Amplify Gen2** - Integrating Next.js with Cognito authentication
- **Serverless Architecture** - API Gateway + Lambda patterns
- **Healthcare Standards** - FHIR, EDI 837, CPT/ICD-10 coding systems

### 📚 Future Learning Goals
- **AI/ML Services** - Amazon Transcribe, Bedrock integration
- **Advanced Security** - VPC design, WAF configuration
- **DevOps** - CI/CD pipelines, automated testing
- **Healthcare Interoperability** - HL7, FHIR resource mapping

**Note**: As a student project, I'm keeping costs minimal (~$35/month) while learning AWS services.

---

## 🛠️ Tech Stack

**Frontend**
- ⚛️ Next.js 14 + React 18
- 📘 TypeScript
- 🎨 TailwindCSS

**Backend**
- 🟢 Node.js + Express
- ☁️ AWS SDK v3

**Infrastructure (AWS)**
- 🗄️ DynamoDB (databases)
- 📦 S3 (storage)
- ⚡ Lambda + API Gateway (APIs)
- 🔐 Cognito (auth)
- 🎙️ Transcribe + Bedrock (AI)
- 🔒 KMS (encryption)
- 📊 CloudTrail (audit logs)

**DevOps**
- 🏗️ Terraform (infrastructure as code)
- 🔄 GitHub Actions (CI/CD)
- 🌐 AWS Amplify (temporary frontend hosting)

---

## 📁 Repository Structure

```
revclear/
├── Demo/                    # 🌐 GitHub Pages demo site
│   ├── index.html          # 📄 Main demo page
│   ├── script.js           # ⚙️ Interactive functionality
│   └── style.css           # 🎨 Styling
│
├── RevClear/                # 🏗️ Application code
│   ├── backend/            # 🟢 Node.js API
│   └── frontend/           # ⚛️ Next.js app
│
├── terraform/               # 🏗️ Infrastructure as code
│   ├── main.tf             # ⚙️ AWS resources
│   ├── variables.tf        # 🔧 Configuration variables
│   ├── outputs.tf          # 📤 Resource outputs
│   └── modules/            # 📦 Reusable components
│
├── docs/                    # 📚 Documentation
│   ├── ARCHITECTURE_DIAGRAMS.md    # 🏛️ System design
│   ├── AWS_COMPLETE_GUIDE.md       # ☁️ AWS services
│   └── AWS_COST_MANAGEMENT.md      # 💰 Cost optimization
│
└── README.md               # 📖 This file
```

---

## ⚙️ Environment Setup

### Backend (.env)
```env
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# DynamoDB Tables
DYNAMODB_TABLE_PHYSICAL_THERAPY=physical_therapy_patients
DYNAMODB_TABLE_SPEECH_THERAPY=speech_therapy_patients
DYNAMODB_TABLE_MENTAL_HEALTH=mental_health_patients

# S3 Buckets
S3_BUCKET_MAIN=arevclear
S3_BUCKET_RAW=arevclear-raw
S3_BUCKET_EXPORTS=arevclear-exports
S3_BUCKET_LOGS=arevclear-logs

# KMS
KMS_KEY_ID=4ed14exxxxxxxx10-78de-4dxxbe-97xxx-xxxxxxxxxxx

# Cognito (coming soon)
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_CLIENT_ID=
```

⚠️ **Never commit `.env` files!** Use `.env.example` for templates.

---

## 🚢 Deployment

### Option 1: Terraform (Recommended)
```bash
cd terraform

# Initialize
terraform init

# Create backend resources (one-time)
aws s3 mb s3://revclear-terraform-state
aws dynamodb create-table \
  --table-name revclear-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Deploy infrastructure
terraform plan -var-file="environments/dev/terraform.tfvars"
terraform apply -var-file="environments/dev/terraform.tfvars"
```

See [`terraform/README.md`](terraform/README.md) for detailed instructions.

### Option 2: GitHub Actions (Automated)
Push to `main` branch triggers automatic deployment.

Required GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

---

## 🔐 Security & HIPAA Compliance

**Encryption**
- ✅ At rest: KMS encryption on all S3 buckets and DynamoDB tables
- ✅ In transit: TLS 1.3 for all API communications
- ✅ Key rotation: Automatic rotation enabled

**Access Control**
- ✅ IAM roles with least privilege
- ✅ MFA required for production access
- ✅ VPC private subnets (planned)

**Audit & Monitoring**
- ✅ CloudTrail logging (multi-region, 7-year retention)
- ✅ Log validation enabled
- ✅ Encrypted audit logs

**Compliance Checklist**
- [x] KMS encryption configured
- [x] CloudTrail enabled
- [x] DynamoDB PITR enabled
- [x] S3 versioning enabled
- [ ] Cognito MFA configured (pending)
- [ ] VPC isolation (pending)
- [ ] CloudWatch alarms (pending)

---

## 📊 Architecture

RevClear uses a serverless AWS architecture:

```
Clinician
    ↓
CloudFront + S3 (Frontend)
    ↓
API Gateway (HTTPS)
    ↓
Lambda Functions (Backend)
    ↓
DynamoDB (Patient Data) + S3 (Files)
    ↓
Transcribe → Bedrock (AI Processing)
    ↓
EDI 837 Generation
    ↓
External Clearinghouse
```

Full architecture diagrams: [`docs/ARCHITECTURE_DIAGRAMS.md`](docs/ARCHITECTURE_DIAGRAMS.md)

---

## 💰 Cost Breakdown

### Current (Minimal Setup)
| Service | Monthly Cost |
|---------|--------------|
| DynamoDB | $5-10 |
| S3 | $5 |
| CloudTrail | $5 |
| KMS | $1 |
| Amplify | $15-20 |
| **Total** | **~$31-41** |

### Projected (Full Production)
| Service | Monthly Cost |
|---------|--------------|
| DynamoDB | $10-15 |
| S3 | $10-15 |
| CloudFront | $10-15 |
| API Gateway + Lambda | $10-20 |
| Cognito | $0-5 |
| Transcribe | $50-100 |
| Bedrock | $50-150 |
| Monitoring | $20-30 |
| **Total** | **~$160-350** |

Full cost analysis: [`docs/AWS_COST_MANAGEMENT.md`](docs/AWS_COST_MANAGEMENT.md)

---

## 🧪 Testing

```bash
# Backend tests
cd RevClear/backend
npm test

# Frontend tests
cd RevClear/frontend
npm test

# E2E tests
npm run test:e2e

# Terraform validation
cd terraform
terraform validate
terraform fmt -check
```

---

## 💡 Skills Demonstrated

This project showcases my ability to:

**Cloud & Infrastructure**
- Design and deploy AWS infrastructure following HIPAA compliance
- Use Infrastructure as Code (Terraform) for reproducible deployments
- Implement encryption at rest and in transit (KMS, TLS)
- Configure audit logging and monitoring (CloudTrail)

**Software Development**
- Build full-stack applications with Next.js and Node.js
- Write TypeScript for type-safe code
- Create responsive UIs with TailwindCSS
- Design RESTful APIs and GraphQL schemas

**System Architecture**
- Create professional architecture diagrams (C4 Model, DFD, ERD, Sequence)
- Perform threat modeling (STRIDE methodology)
- Document complex systems clearly
- Apply security best practices

**Healthcare IT Knowledge**
- Understand HIPAA compliance requirements
- Learn medical coding standards (CPT, ICD-10)
- Study healthcare data formats (EDI 837, FHIR)
- Design Human-in-the-Loop validation workflows

---

## 📚 Documentation

- **[Terraform Guide](terraform/README.md)** - Infrastructure deployment
- **[Architecture Diagrams](docs/ARCHITECTURE_DIAGRAMS.md)** - System design
- **[AWS Services Guide](docs/AWS_COMPLETE_GUIDE.md)** - AWS resource details
- **[Cost Management](docs/AWS_COST_MANAGEMENT.md)** - Cost optimization
- **[Security Guide](docs/SECURITY.md)** - HIPAA compliance

---

## 🐛 Troubleshooting

### AWS Connection Issues
```bash
# Test AWS credentials
aws sts get-caller-identity

# List DynamoDB tables
aws dynamodb list-tables

# Test S3 access
aws s3 ls s3://arevclear/

# Verify KMS key
aws kms describe-key --key-id YOUR_KEY_ID
```

### Terraform Issues
```bash
# Reinitialize
terraform init -upgrade

# Force unlock (if stuck)
terraform force-unlock LOCK_ID

# Refresh state
terraform refresh
```

### Common Errors
**"Table does not exist"**: Verify table names in `.env`  
**"Access Denied"**: Check IAM permissions  
**"Port already in use"**: `kill -9 $(lsof -ti:8080)`

---

## 🎯 Target Market

**Primary Users**:
- Mental Health Professionals (845,450 US providers)
- Physical Therapists (130,430 US providers)
- Speech-Language Pathologists (50,000 US providers)

**Value Proposition**:
- 50% reduction in billing time
- 95%+ coding accuracy
- 85%+ first-pass claim acceptance
- HIPAA-compliant by default

---

## ✨ Key Technical Achievements

- ✅ HIPAA-compliant AWS infrastructure (KMS, CloudTrail, encryption)
- ✅ Professional architecture documentation (C4, DFD, ERD, UML)
- ✅ STRIDE threat model for healthcare security
- ✅ Interactive demo with workflow simulation
- ✅ Infrastructure as Code with Terraform
- ✅ Multi-tier database design (DynamoDB)
- ✅ Serverless architecture pattern
- ✅ Cost-optimized cloud deployment (~$35/month)

---

## 📄 License & Usage

**Student Portfolio Project** - For demonstration and educational purposes

This project demonstrates my technical abilities and understanding of:
- Cloud architecture and AWS services
- Healthcare IT security and HIPAA compliance  
- Full-stack development with modern frameworks
- Professional software engineering practices

**Note**: This is not a production medical billing system. It's a learning project showcasing cloud infrastructure design and healthcare IT concepts.

---

## 📞 About This Project

**Project Type**: Student Portfolio / Learning Demonstration  
**Focus Area**: Cloud Architecture, Healthcare IT, Full-Stack Development  
**Status**: Active Learning & Development  
**Last Updated**: November 9, 2025  

**Developed by**: A Computer Science Student passionate about Cloud Computing and Healthcare Technology

---

## 🎯 For Recruiters & Employers

This project demonstrates:
- ✅ Self-directed learning and initiative
- ✅ Cloud architecture design skills (AWS)
- ✅ Understanding of healthcare compliance (HIPAA)
- ✅ Full-stack development capabilities
- ✅ Professional documentation practices
- ✅ System design and security awareness

**Live Demo**: https://hpppm.github.io/revclear/  
**Documentation**: Comprehensive docs in `/docs` folder
