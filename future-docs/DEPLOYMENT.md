# Deployment Guide

Complete deployment instructions for RevClear across all environments.

---

## 📚 Table of Contents

1. [Quick Deployment](#quick-deployment)
2. [Local Development](#local-development)
3. [GitHub Pages (Demo)](#github-pages-demo)
4. [GCP Cloud Run (Production)](#gcp-cloud-run-production)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Deployment

### Current Deployments

| Environment | Platform | URL | Status |
|------------|----------|-----|--------|
| **Demo** | GitHub Pages | https://hpppm.github.io/revclear/ | ✅ Auto-deploy |
| **Production** | GCP Cloud Run | TBD | 🔧 Ready to configure |
| **Local Dev** | localhost | http://localhost:3000 | 🛠️ Manual |

---

## 🛠️ Local Development

### Prerequisites

- Node.js 20+ 
- npm 9+
- Git
- GCP account (for production features)

### Backend Setup

```bash
# Navigate to backend
cd RevClear/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your configuration to .env:
# DB_USER=your_db_user
# DB_PASS=your_db_password
# DB_NAME=medical
# FIREBASE_PROJECT_ID=your_project_id
# GCP_PROJECT_ID=your_gcp_project

# Run development server
npm run dev

# Backend will be running at http://localhost:8080
```

### Frontend Setup

```bash
# Navigate to frontend
cd RevClear/frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Add your configuration:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8080/api
# NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Run development server
npm run dev

# Frontend will be running at http://localhost:3000
```

### Demo Setup

```bash
# Navigate to Demo folder
cd Demo

# Open in browser (no build required)
# Option 1: Double-click index.html
# Option 2: Use local server
python -m http.server 8000
# Open http://localhost:8000
```

---

## 📄 GitHub Pages (Demo)

### Current Setup

The Demo site automatically deploys to GitHub Pages on every push to `main` that modifies markdown files.

### Workflow File

`.github/workflows/deploy-demo.yml`

```yaml
name: Deploy Demo to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - '**.md'
      - 'Demo/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./Demo
```

### Manual Deploy

```bash
# Push to trigger deployment
git add Demo/
git commit -m "Update demo"
git push origin main

# Check deployment status
# GitHub Actions: https://github.com/hpppm/revclear/actions
```

### View Live Demo

https://hpppm.github.io/revclear/

---

## ☁️ GCP Cloud Run (Production)

### Prerequisites

1. **GCP Account with Billing**
2. **Business Associate Agreement (BAA)** signed with Google Cloud
3. **`gcloud` CLI** installed and authenticated

### Initial GCP Setup

```bash
# Install gcloud CLI
# Windows:
winget install Google.CloudSDK

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudkms.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com
```

### Backend Deployment (Cloud Run)

#### Step 1: Build Docker Image

```bash
cd RevClear/backend

# Build image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/medical-backend:latest
```

#### Step 2: Create Cloud SQL Database

```bash
# Create PostgreSQL instance
gcloud sql instances create medical-db \
  --database-version=POSTGRES_14 \
  --tier=db-g1-small \
  --region=us-central1 \
  --root-password=SECURE_PASSWORD

# Create database
gcloud sql databases create medical --instance=medical-db

# Create user
gcloud sql users create api_backend \
  --instance=medical-db \
  --password=SECURE_PASSWORD
```

#### Step 3: Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy api-backend \
  --image gcr.io/YOUR_PROJECT_ID/medical-backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated=false \
  --service-account api-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars DB_USER=api_backend,DB_NAME=medical \
  --set-secrets DB_PASS=db-password:latest \
  --vpc-connector hipaa-vpc-connector
```

#### Step 4: Configure Automatic Deployment

The repository includes `RevClear/backend/cloudbuild.yaml`:

```yaml
steps:
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/medical-backend:latest', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/medical-backend:latest']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'api-backend'
      - '--image=gcr.io/$PROJECT_ID/medical-backend:latest'
      - '--region=us-central1'
      - '--service-account=api-backend@$PROJECT_ID.iam.gserviceaccount.com'
      - '--allow-unauthenticated=false'
    timeout: '900s'
```

#### Step 5: Connect GitHub to Cloud Build

```bash
# Create Cloud Build trigger
gcloud builds triggers create github \
  --name="deploy-backend" \
  --repo-name=revclear \
  --repo-owner=hpppm \
  --branch-pattern="^main$" \
  --build-config=RevClear/backend/cloudbuild.yaml
```

Now every push to `main` automatically deploys the backend!

### Frontend Deployment

Frontend can be deployed to:

#### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd RevClear/frontend
vercel

# Follow prompts to link to Vercel account
```

#### Option 2: Cloud Run (Static Container)

```bash
# Build Next.js
cd RevClear/frontend
npm run build

# Create Dockerfile
# Deploy to Cloud Run similar to backend
```

---

## 🔐 Environment Variables

### Backend (.env)

```bash
# Database
DB_USER=api_backend
DB_PASS=secure_password_here
DB_NAME=medical
DB_HOST=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME

# Firebase
FIREBASE_PROJECT_ID=your_firebase_project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json

# GCP
GCP_PROJECT_ID=your_gcp_project_id
GCP_REGION=us-central1

# Optional: Notion
NOTION_TOKEN=ntn_your_notion_token
NOTION_DATABASE_ID=your_database_id
```

### Frontend (.env.local)

```bash
# Backend API
NEXT_PUBLIC_BACKEND_URL=https://api-backend-xxx.run.app/api

# Firebase Auth
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### GitHub Secrets

Add these in GitHub repo settings → Secrets and variables → Actions:

```
GITHUB_TOKEN (automatic)
NOTION_TOKEN (if using Notion sync)
NOTION_DATABASE_ID (if using Notion sync)
GCP_PROJECT_ID (for Cloud Build)
GCP_SA_KEY (service account JSON key)
```

---

## 🐛 Troubleshooting

### Local Development Issues

**Issue**: `Error: Cannot find module`  
**Solution**: Run `npm install` in the correct directory

**Issue**: Port already in use  
**Solution**: 
```bash
# Kill process on port
npx kill-port 3000  # or 8080 for backend
```

**Issue**: Database connection failed  
**Solution**: Check `.env` file has correct credentials

### GCP Deployment Issues

**Issue**: `Permission denied`  
**Solution**: 
```bash
# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT \
  --role=roles/run.admin
```

**Issue**: Cloud Build fails  
**Solution**: Check Cloud Build logs:
```bash
gcloud builds list
gcloud builds log BUILD_ID
```

**Issue**: Cloud Run service won't start  
**Solution**: Check logs:
```bash
gcloud run services logs read api-backend --region=us-central1
```

### GitHub Pages Issues

**Issue**: Demo not updating  
**Solution**: 
1. Check GitHub Actions: https://github.com/hpppm/revclear/actions
2. Verify workflow file exists: `.github/workflows/deploy-demo.yml`
3. Check branch permissions in Settings → Pages

---

## 📊 Deployment Checklist

### Before First Production Deploy

- [ ] Sign Google Cloud BAA
- [ ] Create GCP project with billing
- [ ] Enable all required APIs
- [ ] Set up Cloud SQL database
- [ ] Create service accounts
- [ ] Configure Secret Manager
- [ ] Set up VPC and networking
- [ ] Create Cloud Storage buckets
- [ ] Configure Firebase Auth
- [ ] Test Cloud Build pipeline
- [ ] Set up monitoring and alerts
- [ ] Document all credentials

### Before Each Deploy

- [ ] Run tests locally (`npm test`)
- [ ] Check for security issues
- [ ] Update version numbers
- [ ] Review environment variables
- [ ] Test in staging environment
- [ ] Review Cloud Build logs
- [ ] Verify database migrations
- [ ] Check HIPAA compliance

### After Deploy

- [ ] Verify service is running
- [ ] Test critical user flows
- [ ] Check monitoring dashboards
- [ ] Review error logs
- [ ] Test API endpoints
- [ ] Verify database connectivity
- [ ] Check backup systems
- [ ] Document any changes

---

## 🚀 Quick Commands Reference

```bash
# Local Development
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Production build

# GCP Commands
gcloud builds submit                    # Build image
gcloud run deploy                       # Deploy service
gcloud run services list                # List services
gcloud run services logs read SERVICE   # View logs

# Git Commands
git push origin main                    # Deploy via CI/CD
git tag v1.0.0                         # Create version tag
git push --tags                        # Push version tags
```

---

## 📚 Additional Resources

- **Backend Architecture**: See `RevClear/backend/ARCHITECTURE.md`
- **Frontend Architecture**: See `RevClear/frontend/ARCHITECTURE.md`
- **API Documentation**: See `RevClear/backend/Documentation/routes/API_ROUTES.md`
- **Security & HIPAA**: See `SECURITY.md`
- **Team Workflow**: See `TEAM_GUIDE.md`
- **MCP Setup**: See `MCP_GUIDE.md`

---

## 📞 Support

**GCP Issues**: https://cloud.google.com/support  
**GitHub Issues**: https://github.com/hpppm/revclear/issues  
**Team Lead**: Contact via Gannon University

---

**Last Updated**: November 2, 2025  
**Maintained By**: RevClear Team
