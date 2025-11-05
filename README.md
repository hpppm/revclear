# RevClear - Healthcare AI Billing Medical System

A production-ready HIPAA-compliant healthcare claims management system for mental health, physical therapy, and speech-language pathology practices.

## 🏥 Project Overview

RevClear is a **medical claims processing platform** that automates the entire billing workflow from clinical documentation to insurance claim submission. Built specifically for small specialty practices, RevClear reduces billing time by 50%+ while improving claim acceptance rates.

### What RevClear Does

- **Speech-to-Text**: Convert clinical sessions into structured notes
- **AI Medical Coding**: Automated CPT and ICD code generation with 95%+ accuracy
- **Claim Generation**: Export to ANSI X12 EDI 837 format
- **Denial Analysis**: Learn from ERA 835 responses to improve future claims
- **Compliance**: Three human-in-the-loop checkpoints ensure accuracy and HIPAA compliance

## 🏗️ Architecture

```
revclear/
├── RevClear/
│   ├── backend/          # FastAPI + Python 3.12 + SQLAlchemy
│   ├── frontend/         # React 18 + TypeScript + Tailwind CSS
│   └── Demo/            # Static demo site
├── terraform/           # AWS infrastructure as code
├── docs/                # Documentation
└── tests/               # Test suites
```

## ✨ Key Features

- **HIPAA Compliant**: AWS BAA, encryption at rest/transit, 7-year audit logs
- **Three-Gate Review**: Mandatory human checkpoints before claim submission
- **AI-Powered**: SageMaker models for coding and denial prediction
- **Modern Stack**: React 18, FastAPI, PostgreSQL, TypeScript
- **AWS Cloud**: ECS, RDS, S3, Lambda, SageMaker
- **Multi-tenant**: Secure data isolation per clinic

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Docker & Docker Compose
- AWS account with HIPAA BAA
- Terraform 1.5+

### Ports & URLs

- **Backend API**: `http://localhost:8080`
- **Frontend App**: `http://localhost:3000`
- **Demo Page**: `http://localhost:8080` (static demo)
- **Live Demo**: https://hpppm.github.io/revclear/Demo/index.html

### Local Development

#### Backend Setup

```bash
# Navigate to backend
cd RevClear/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your local settings

# Run database migrations
alembic upgrade head

# Start development server
uvicorn main:app --reload --port 8080
```

#### Frontend Setup

```bash
# Navigate to frontend
cd RevClear/frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your local settings

# Start development server
npm run dev
```

#### Docker Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

#### Backend (.env)

```env
# Server
PORT=8080
NODE_ENV=development
DEBUG=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/revclear
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# S3
S3_BUCKET_PHI=revclear-phi-storage
S3_BUCKET_CLAIMS=revclear-claims-archive

# RDS
RDS_ENDPOINT=your-rds-endpoint.rds.amazonaws.com
RDS_PORT=5432
RDS_DB_NAME=revclear

# SageMaker
SAGEMAKER_ENDPOINT_CODING=revclear-coding-model
SAGEMAKER_ENDPOINT_DENIAL=revclear-denial-prediction

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60

# Redis (Session/Cache)
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# AWS Transcribe
TRANSCRIBE_LANGUAGE_CODE=en-US
TRANSCRIBE_MEDICAL_SPECIALTY=PRIMARYCARE

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
```

#### Frontend (.env.local)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_TIMEOUT=30000

# Auth
NEXT_PUBLIC_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_CLIENT_ID=your-client-id

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_CODING=true
NEXT_PUBLIC_ENABLE_DENIAL_PREDICTION=true

# Environment
NEXT_PUBLIC_ENV=development
```

⚠️ **Never commit .env files to Git!**

## 📦 Deployment

### Deployment Methods

We use **two main deployment approaches**:

1. **Bash Scripts** - Manual deployment and infrastructure management
2. **GitHub Actions** - Automated CI/CD pipeline

### AWS Infrastructure Setup

#### Prerequisites

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1)

# Verify AWS connection
aws sts get-caller-identity
```

#### Infrastructure Components

Our AWS infrastructure includes the following services:

**Core Services:**
- **RDS (PostgreSQL)** - Primary database for PHI storage with encryption
- **S3** - Static frontend hosting and clinical document storage
- **Secrets Manager** - Secure credential storage (DB passwords, API keys)
- **Cognito** - User authentication and authorization
- **CloudFront** - CDN for frontend distribution
- **EC2/ECS/Elastic Beanstalk** - Backend application hosting options

**Security & Monitoring:**
- **IAM** - Access control and role management
- **KMS** - Encryption key management for all PHI data
- **CloudWatch** - Logging and monitoring (7-year retention)
- **CloudTrail** - Audit logging for all AWS API calls
- **WAF** - Web application firewall for attack protection
- **VPC** - Network isolation with private subnets

**Additional Services:**
- **SageMaker** - AI/ML model training and inference
- **Transcribe Medical** - Speech-to-text for clinical notes
- **Lambda** - Serverless functions for workflows
- **API Gateway** - API management and throttling
- **SQS** - Message queuing for async processing
- **ElastiCache (Redis)** - Session storage and caching

### Deployment Method 1: Bash Scripts

We have bash scripts to create and manage AWS resources manually:

```bash
# Navigate to backend directory
cd RevClear/backend

# Make scripts executable
chmod +x aws-services.sh

# Run AWS setup script
./aws-services.sh

# The script will:
# 1. Check AWS connection
# 2. Create RDS database instance
# 3. Create Cognito user pool
# 4. Create S3 buckets (frontend + PHI storage)
# 5. Set up Secrets Manager
# 6. Configure IAM roles
# 7. Deploy database schema
# 8. Output connection details
```

**What the bash scripts do:**
- Create all necessary AWS resources
- Configure security settings (encryption, access control)
- Deploy database schemas and sample data
- Set up monitoring and logging
- Validate HIPAA compliance settings

### Deployment Method 2: GitHub Actions (Automated CI/CD)

Our GitHub Actions workflow automates deployment on every push:

**Workflow File:** `.github/workflows/aws-deployment.yml`

**Trigger Events:**
- Push to `main`, `test-aws`, or `aws-migration` branches
- Pull requests to these branches
- Manual workflow dispatch with environment selection

**Pipeline Stages:**

#### Stage 1: AWS Setup & Verification
```yaml
# What it does:
- Checkout code
- Configure AWS credentials from GitHub Secrets
- Verify AWS connection (aws sts get-caller-identity)
- Check existing AWS resources:
  - RDS databases
  - Cognito user pools
  - S3 buckets
  - Secrets Manager entries
```

#### Stage 2: Backend Deployment
```yaml
# What it does:
- Install Node.js dependencies
- Build backend application
- Retrieve database credentials from Secrets Manager
- Deploy database schema to RDS
- Load sample data (if needed)
- Test AWS SDK connectivity
- Create deployment summary
```

#### Stage 3: Frontend Deployment
```yaml
# What it does:
- Install frontend dependencies
- Build Next.js application
- Sync build output to S3 bucket
- Set cache headers for static assets
- Provide S3 website URL
- Create deployment summary
```

#### Stage 4: AWS CLI Scripts
```yaml
# What it does:
- Run custom AWS setup scripts
- List Cognito users
- List S3 buckets and RDS instances
- Verify all services are running
- Generate infrastructure report
```

**GitHub Actions Configuration:**

Required secrets in GitHub repository settings:
- `AWS_ACCESS_KEY_ID` - AWS IAM access key
- `AWS_SECRET_ACCESS_KEY` - AWS IAM secret key
- `AWS_REGION` - Default: us-east-1
- `AWS_USER_POOL_ID` - Cognito user pool ID
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

**Workflow Features:**
- ✅ Automatic deployment on code push
- ✅ Environment-specific deployments (test, staging, production)
- ✅ Rollback capability on failure
- ✅ Deployment summaries and logs
- ✅ AWS resource validation
- ✅ Security scanning before deployment

### Manual Deployment Commands

If you prefer manual control, use these AWS CLI commands:

#### Deploy Backend
```bash
# Option 1: Deploy to EC2
ssh -i your-key.pem ec2-user@your-instance-ip
git pull origin main
npm install
npm run build
pm2 restart revclear-backend

# Option 2: Deploy to Elastic Beanstalk
eb init -p node.js-20 revclear-backend
eb create production-env
eb deploy

# Option 3: Deploy to ECS (Requires Docker image in ECR)
aws ecs update-service \
  --cluster revclear-cluster \
  --service revclear-backend \
  --force-new-deployment
```

#### Deploy Frontend
```bash
# Build frontend
cd RevClear/frontend
npm run build

# Deploy to S3
aws s3 sync out/ s3://revclear-frontend-bucket --delete

# Invalidate CloudFront cache (if using CDN)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### Database Management
```bash
# Connect to RDS database
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d revclear

# Deploy schema updates
psql -h $DB_HOST -U $DB_USER -d revclear \
  -f RevClear/backend/Documentation/db/002_cloud_db_schema.sql

# Load sample data
psql -h $DB_HOST -U $DB_USER -d revclear \
  -f RevClear/backend/Documentation/db/003_sample_data.sql
```

### GitHub Pages (Demo Only)

Static demo automatically deploys on push to `main`:
- **URL**: https://hpppm.github.io/revclear/Demo/index.html
- **Source**: `Demo/` folder
- **Purpose**: Public demonstration (no PHI, no real features)

### Deployment Best Practices

**Before Deploying:**
1. ✅ Test locally with Docker Compose
2. ✅ Run all unit and integration tests
3. ✅ Scan for security vulnerabilities
4. ✅ Review code changes with team
5. ✅ Backup production database

**After Deploying:**
1. ✅ Verify health checks pass
2. ✅ Check CloudWatch logs for errors
3. ✅ Test critical user flows
4. ✅ Monitor performance metrics
5. ✅ Document deployment in changelog

**Emergency Rollback:**
```bash
# GitHub Actions: Re-run previous successful workflow

# Manual ECS rollback:
aws ecs update-service \
  --cluster revclear-cluster \
  --service revclear-backend \
  --task-definition revclear-backend:PREVIOUS_VERSION

# Manual S3 rollback (if versioning enabled):
aws s3 sync s3://revclear-frontend-backup/ s3://revclear-frontend-bucket/
```

## 👥 Team & Ownership

- **Product Lead**: Aseel Alqoud (requirements, documentation, compliance)
- **Backend Lead**: Rasmus (`RevClear/backend/`) - Ask before editing
- **Frontend Lead**: Yarni (`RevClear/frontend/`) - Ask before editing
- **DevOps Lead**: Brandan (`terraform/`, CI/CD)
- **Demo Site**: Aseel (`Demo/`) - Anyone can suggest changes
- **Documentation**: Aseel (Root `.md` files) - Anyone can suggest changes

## 📚 Documentation

### 🚀 Start Here

- **[Team Guide](TEAM_GUIDE.md)** ⭐ - Git workflow, roles, collaboration rules
- **[Getting Started](GETTING_STARTED.md)** - Detailed setup instructions
- **[Project Documentation](docs/PROJECT_DOCUMENTATION.md)** - Complete system overview
- **[Demo Guide](Demo/README.md)** - Check out the working demo

### 📁 Additional Documentation

- **[API Reference](docs/API_REFERENCE.md)** - REST API endpoints
- **[AWS Architecture](docs/AWS_ARCHITECTURE.md)** - Infrastructure details
- **[HIPAA Compliance](docs/HIPAA_COMPLIANCE.md)** - Security and compliance
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment steps

## 🤝 Contributing

### Git Workflow

```bash
# 1. Start new task
git checkout main
git pull origin main
git checkout -b feature/yourname-task-description

# 2. Make changes and commit
git add .
git commit -m "feat: add patient registration form"
git push origin feature/yourname-task-description

# 3. Create Pull Request on GitHub
# - Request review from team lead
# - Merge after approval

# 4. Clean up after merge
git checkout main
git pull origin main
git branch -D feature/yourname-task-description
```

### Commit Message Format

Use conventional commits:

```bash
feat: add new feature
fix: bug fix
docs: documentation changes
style: code formatting
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

Examples:
- `feat: add speech-to-text transcription`
- `fix: resolve CPT code validation error`
- `docs: update AWS deployment guide`

### Important Rules

⚠️ **Never commit:**
- `.env` files (contain secrets!)
- `node_modules/` or `venv/`
- AWS credentials or API keys
- Real PHI data (use synthetic data only!)

✅ **Always:**
- Pull before you push
- Create feature branches
- Write clear commit messages
- Test your code locally
- Request code reviews
- Update documentation

## 🔒 Security

### HIPAA Compliance

- **Encryption**: All PHI encrypted at rest (KMS) and in transit (TLS 1.2+)
- **Access Control**: Role-based access with MFA required
- **Audit Logging**: 7-year retention in CloudWatch and S3
- **Data Isolation**: VPC private subnets for all PHI resources
- **Incident Response**: 24-hour breach notification procedures

### Security Checklist

- [ ] All API endpoints require authentication
- [ ] PHI encrypted in RDS, S3, ElastiCache
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled (React escaping)
- [ ] CORS properly configured
- [ ] Rate limiting enabled (API Gateway)
- [ ] Security headers configured (Helmet.js)
- [ ] AWS IAM roles use least privilege
- [ ] CloudTrail logging enabled in all regions
- [ ] WAF rules configured (SQLi, XSS protection)
- [ ] Secrets rotated every 90 days
- [ ] MFA enabled for all admin accounts

### Security Scanning

```bash
# Run security scans locally
npm run security:check

# Backend Python dependencies
pip-audit

# Frontend npm dependencies
npm audit

# OWASP dependency check
dependency-check --project revclear --scan .

# Terraform security scan
tfsec terraform/
```

## 🧪 Testing

### Run Tests Locally

```bash
# Backend tests
cd RevClear/backend
pytest
pytest --cov=. --cov-report=html  # With coverage

# Frontend tests
cd RevClear/frontend
npm test
npm run test:coverage

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### Test Data

⚠️ **Only synthetic data is used in development and testing**

- **Patients**: 50 synthetic patient records
- **Clinical Notes**: 500+ sample transcripts
- **Claims**: 200 test EDI 837 files
- **ERA Responses**: 150 sample ERA 835 files

**No real PHI is used in any non-production environment**

## 📊 Project Status

### Phase 1: MVP (Current - Months 1-5)
- [x] AWS infrastructure setup
- [x] Backend API foundation
- [x] Frontend UI components
- [x] HIPAA compliance framework
- [x] Speech-to-text integration
- [ ] AI CPT/ICD coding (in progress)
- [ ] EDI 837 generation (in progress)
- [ ] ERA 835 import (planned)
- [ ] Pilot deployment (planned)

### Phase 2: Growth (Months 6-12)
- [ ] Clearinghouse integration
- [ ] Enhanced denial prediction
- [ ] Advanced reporting dashboard
- [ ] Mobile app
- [ ] Multi-region deployment

### Phase 3: Scale (Months 13-24)
- [ ] Real-time eligibility verification
- [ ] Payment processing
- [ ] Advanced analytics
- [ ] Third-party API
- [ ] Multi-state expansion

## 🐛 Troubleshooting

### Common Issues

**Port 8080 already in use**
```bash
# Find process using port
lsof -ti:8080

# Kill process
kill -9 $(lsof -ti:8080)
```

**Docker containers won't start**
```bash
# Remove all containers and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

**Database connection fails**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
alembic upgrade head
```

**AWS credentials not working**
```bash
# Reconfigure AWS CLI
aws configure

# Test credentials
aws sts get-caller-identity

# Check IAM permissions
aws iam get-user
```

**Frontend build fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install
npm run build
```

## 📞 Support

- **Technical Issues**: Open an issue on GitHub
- **Security Concerns**: Email security@revclear.com
- **Feature Requests**: Create a GitHub Discussion
- **Team Questions**: Slack #revclear-dev

## 🎯 Target Users

**Primary Market:**
- Mental Health Professionals (845,450 US providers)
- Physical Therapists (130,430 US providers)
- Speech-Language Pathologists (50,000 US providers)

**Pilot Markets:**
- Buffalo, NY
- Cleveland, OH
- Pittsburgh, PA

**Success Metrics:**
- 95%+ coding accuracy
- 85%+ first-pass claim acceptance
- 50%+ reduction in billing time
- Positive user feedback from pilot

## 📄 License

Private repository - All rights reserved

## 🏆 Success Criteria

**Technical:**
- ✅ Speech-to-text transcription functional
- ✅ AI code suggestion with 95%+ accuracy
- ✅ EDI 837 generation and export
- ✅ ERA 835 import and analysis
- ✅ Three human-in-the-loop checkpoints

**Business:**
- 100+ pilot users by Month 5
- Clear ROI: subscription < time saved + fewer denials
- Differentiated value for small specialty practices

**Compliance:**
- AWS BAA signed and verified
- All PHI encrypted (at rest and in transit)
- 7-year audit log retention
- Zero critical security vulnerabilities
- Quarterly HIPAA compliance audits passed

---

Built with ❤️ by the RevClear Team

**Last Updated**: January 2025  
**Version**: 1.0.0-alpha  
**Status**: Active Development (MVP Phase)

---

## Quick Reference

**Start Development:**
```bash
docker-compose up -d && npm run dev
```

**Run Tests:**
```bash
npm run test:all
```

**Deploy to AWS:**
```bash
cd terraform && terraform apply && cd ../RevClear/backend && ./deploy.sh
```

**View Logs:**
```bash
docker-compose logs -f
```
