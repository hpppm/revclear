# RevClear Repository Structure

## 📁 Repository Organization

```
revclear/
├── .github/                    # GitHub Actions workflows
│   └── workflows/
│       ├── aws-deploy.yml      # AWS deployment workflow
│       └── create-aws-resources.yml
│
├── Demo/                       # GitHub Pages demo site
│   ├── index.html              # Interactive demo
│   ├── script.js               # Demo functionality
│   ├── style.css               # Demo styling
│   ├── login.html              # Login page
│   └── signup.html             # Signup page
│
├── RevClear/                   # Main application code
│   ├── backend/                # Node.js/Express backend API
│   │   ├── src/                # Source code
│   │   ├── tests/              # API tests
│   │   └── package.json        # Dependencies
│   │
│   └── frontend/               # Next.js React frontend
│       ├── src/                # Source code
│       ├── public/             # Static assets
│       └── package.json        # Dependencies
│
├── terraform/                  # Infrastructure as Code
│   ├── main.tf                 # Main Terraform config
│   ├── variables.tf            # Input variables
│   ├── outputs.tf              # Output values
│   ├── providers.tf            # AWS provider config
│   ├── README.md               # Terraform documentation
│   │
│   ├── environments/           # Environment-specific configs
│   │   ├── dev/                # Development
│   │   ├── staging/            # Staging
│   │   └── prod/               # Production
│   │
│   └── modules/                # Reusable Terraform modules
│       ├── networking/         # VPC, Subnets, NAT, IGW
│       ├── compute/            # ECS Fargate, ALB, ECR
│       ├── database/           # RDS PostgreSQL
│       ├── storage/            # S3 Buckets
│       ├── ai-services/        # Transcribe, Bedrock, Lambda
│       └── security/           # IAM, KMS, Cognito, WAF
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE_DIAGRAMS.md    # System architecture
│   ├── AWS_COMPLETE_GUIDE.md       # AWS services guide
│   ├── AWS_COST_MANAGEMENT.md      # Cost optimization
│   ├── AWS_README.md               # AWS overview
│   ├── SECURITY.md                 # Security practices
│   └── QUICK_REFERENCE.md          # Quick commands
│
├── index.html                  # GitHub Pages homepage
├── script.js                   # Homepage functionality
├── style.css                   # Homepage styling
├── login.html                  # Login page
├── signup.html                 # Signup page
│
├── .gitignore                  # Git ignore patterns
├── .nojekyll                   # GitHub Pages config
├── README.md                   # Main project README
└── REPO_STRUCTURE.md           # This file

```

## 🎯 Purpose of Each Directory

### `.github/workflows/`
- **GitHub Actions** CI/CD workflows
- Automated testing and deployment
- AWS resource provisioning

### `Demo/`
- **Live demonstration** of the RevClear platform
- Hosted on GitHub Pages: https://hpppm.github.io/revclear/
- Interactive workflow visualization
- Shows all AWS services in action

### `RevClear/`
- **Main application codebase**
- Backend API (Node.js/Express)
- Frontend web app (Next.js/React)
- Database models and migrations
- Business logic and services

### `terraform/`
- **Infrastructure as Code**
- All AWS resources defined in code
- Version-controlled infrastructure
- Multi-environment support (dev/staging/prod)
- Modular and reusable components

### `docs/`
- **Project documentation**
- Architecture diagrams
- AWS service guides
- Security and compliance docs
- Cost management strategies

### Root Files
- `index.html`, `script.js`, `style.css` - GitHub Pages marketing site
- `.gitignore` - Git ignore patterns
- `.nojekyll` - Tells GitHub Pages to serve all files
- `README.md` - Project overview and getting started

## 🚀 Getting Started

### For Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/hpppm/revclear.git
   cd revclear
   ```

2. **Backend Development**
   ```bash
   cd RevClear/backend
   npm install
   npm run dev
   ```

3. **Frontend Development**
   ```bash
   cd RevClear/frontend
   npm install
   npm run dev
   ```

### For DevOps/Infrastructure

1. **Review Terraform documentation**
   ```bash
   cd terraform
   cat README.md
   ```

2. **Initialize Terraform**
   ```bash
   terraform init
   ```

3. **Plan infrastructure changes**
   ```bash
   terraform plan -var-file="environments/dev/terraform.tfvars"
   ```

4. **Apply infrastructure**
   ```bash
   terraform apply -var-file="environments/dev/terraform.tfvars"
   ```

### For Documentation

All documentation is in the `docs/` folder:

- **Architecture**: `docs/ARCHITECTURE_DIAGRAMS.md`
- **AWS Guide**: `docs/AWS_COMPLETE_GUIDE.md`
- **Security**: `docs/SECURITY.md`
- **Costs**: `docs/AWS_COST_MANAGEMENT.md`

## 📝 File Naming Conventions

- **Terraform files**: `*.tf` (lowercase, snake_case)
- **TypeScript/JavaScript**: `*.ts`, `*.tsx`, `*.js` (camelCase)
- **Documentation**: `*.md` (UPPERCASE for main docs)
- **Config files**: `.env.example`, `terraform.tfvars.example`

## 🔐 Security Guidelines

### Never Commit:
- `*.tfvars` (except `.example` files)
- `.env` files with actual secrets
- AWS credentials or API keys
- Database passwords
- Private keys or certificates

### Always Use:
- AWS Secrets Manager for credentials
- Environment variables for config
- `.gitignore` for sensitive files
- Encryption for data at rest

## 🌳 Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

## 📊 AWS Resources

The Terraform configuration creates:

### Core Infrastructure
- VPC with public/private/database subnets across 3 AZs
- NAT Gateways for private subnet internet access
- Internet Gateway for public subnets
- Security Groups with least-privilege rules

### Compute
- ECS Fargate cluster for containerized apps
- Application Load Balancer with HTTPS
- ECR for Docker images
- Auto-scaling policies

### Database
- RDS PostgreSQL (Multi-AZ in production)
- Automated backups
- Encryption at rest with KMS

### Storage
- S3 buckets for audio, documents, and claims
- Lifecycle policies for cost optimization
- Versioning enabled

### Security
- AWS Cognito for user authentication
- IAM roles and policies
- KMS encryption keys
- AWS WAF (optional)
- CloudTrail for audit logging

### AI/ML Services
- Amazon Transcribe for audio-to-text
- Amazon Bedrock for AI/LLM
- Lambda for orchestration

## 💰 Cost Estimates

### Development Environment
- **Monthly**: ~$300-400
- Minimal resources for testing

### Production Environment
- **Monthly**: ~$600-800
- High availability and redundancy
- Full HIPAA compliance features

See `docs/AWS_COST_MANAGEMENT.md` for detailed breakdown.

## 🔧 Tools Required

### Development
- Node.js 18+
- npm or yarn
- Git
- IDE (VS Code recommended)

### Infrastructure
- Terraform 1.0+
- AWS CLI
- Docker (for local testing)

### Deployment
- GitHub account (for Actions)
- AWS account
- Domain name (optional)

## 📚 Additional Resources

- [Main README](./README.md) - Project overview
- [Terraform README](./terraform/README.md) - Infrastructure guide
- [Architecture Diagrams](./docs/ARCHITECTURE_DIAGRAMS.md) - System design
- [AWS Complete Guide](./docs/AWS_COMPLETE_GUIDE.md) - AWS services
- [Live Demo](https://hpppm.github.io/revclear/) - Interactive demo

## 🆘 Support

For issues or questions:
1. Check the relevant README in each directory
2. Review documentation in `docs/`
3. Open an issue on GitHub
4. Contact the development team

---

**Last Updated**: November 8, 2025  
**Repository**: https://github.com/hpppm/revclear
