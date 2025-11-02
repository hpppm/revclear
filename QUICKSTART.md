# 🚀 Quick Start: GCP HIPAA-Compliant Deployment

This guide provides the fastest path to deploying RevClear on Google Cloud Platform with full HIPAA compliance.

## ⚡ Prerequisites (5 minutes)

### 1. Install Required Tools

```bash
# Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL  # Restart shell

# Terraform
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify installations
gcloud --version
terraform --version
```

### 2. Set Up GCP Project

```bash
# Authenticate
gcloud auth login
gcloud auth application-default login

# Create or select project
export PROJECT_ID="revclear-prod"
gcloud projects create $PROJECT_ID --name="RevClear Production"
gcloud config set project $PROJECT_ID

# Link billing account
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 3. Sign HIPAA BAA (CRITICAL)

**⚠️ REQUIRED:** Before handling ANY patient data, you MUST sign Google Cloud's Business Associate Agreement (BAA).

**Option 1: Enterprise Customers**
1. Go to: https://console.cloud.google.com/marketplace/product/google/cloudplatform-hipaa-baa
2. Review and accept the BAA
3. Download a copy for your records

**Option 2: Contact Sales**
- Email: cloud-sales@google.com
- Phone: 1-877-355-5787
- Processing time: 1-2 business days

**Verify BAA status:**
```bash
# Check in console: IAM & Admin → Privacy & Security
```

---

## 🚀 Automated Deployment (15-20 minutes)

### Method 1: One-Command Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/hpppm/revclear.git
cd revclear

# Run automated deployment
./deploy-gcp-hipaa.sh
```

**What it does:**
1. ✅ Verifies prerequisites
2. ✅ Confirms BAA is signed
3. ✅ Configures GCP project
4. ✅ Enables required APIs (25+ services)
5. ✅ Creates Terraform state bucket
6. ✅ Deploys infrastructure (Terraform)
7. ✅ Sets up monitoring and alerting
8. ✅ Validates deployment

**Time:** 15-20 minutes  
**Interaction:** Minimal (confirms BAA, budget, email)

---

### Method 2: Manual Step-by-Step

If you prefer manual control or troubleshooting:

#### Step 1: Enable APIs (5 minutes)

```bash
cd revclear

# Enable all required APIs
gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudkms.googleapis.com \
  secretmanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  dlp.googleapis.com \
  aiplatform.googleapis.com \
  speech.googleapis.com \
  documentai.googleapis.com
```

#### Step 2: Deploy Infrastructure (10 minutes)

```bash
cd terraform

# Create Terraform state bucket
export STATE_BUCKET="${PROJECT_ID}-terraform-state"
gsutil mb -p $PROJECT_ID -l us-central1 gs://$STATE_BUCKET
gsutil versioning set on gs://$STATE_BUCKET

# Configure Terraform
cat > terraform.tfvars <<EOF
project_id   = "$PROJECT_ID"
region       = "us-central1"
environment  = "prod"
domain_name  = "revclear.health"
EOF

cat > backend-config.hcl <<EOF
bucket = "$STATE_BUCKET"
prefix = "terraform/state"
EOF

# Deploy
terraform init -backend-config=backend-config.hcl
terraform plan -out=tfplan
terraform apply tfplan
```

#### Step 3: Validate Deployment (3 minutes)

```bash
cd ..
PROJECT_ID=$PROJECT_ID ./scripts/validate-infrastructure.sh
PROJECT_ID=$PROJECT_ID ./scripts/security-scan.sh
```

---

## 📊 Post-Deployment Setup

### 1. Set Up Cost Monitoring

```bash
PROJECT_ID=$PROJECT_ID ./scripts/cost-monitoring-setup.sh
```

**Configures:**
- Monthly budget alerts
- Cost monitoring dashboard
- Email notifications
- Cost optimization report

### 2. Deploy Application Code

```bash
# Build and deploy backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-backend ./RevClear/backend
gcloud run deploy revclear-backend-prod \
  --image gcr.io/$PROJECT_ID/revclear-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated

# Build and deploy frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-frontend ./RevClear/frontend
gcloud run deploy revclear-frontend-prod \
  --image gcr.io/$PROJECT_ID/revclear-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### 3. Configure Database

```bash
# Get Cloud SQL instance name
INSTANCE_NAME=$(gcloud sql instances list --format="value(name)" | head -1)

# Connect to database
gcloud sql connect $INSTANCE_NAME --user=postgres

# Run migrations
psql -d claims -f database/schema.sql
```

### 4. Set Up Authentication

**Firebase/Identity Platform:**
1. Go to: https://console.firebase.google.com
2. Link to your GCP project
3. Enable Identity Platform (HIPAA-compliant)
4. Configure authentication methods:
   - Email/Password
   - Google Sign-In
   - SAML (for SSO)
5. Enable MFA (required for HIPAA)

### 5. Configure Secrets

```bash
# Store API keys
gcloud secrets create openai-key --data-file=- <<< "your-openai-key"
gcloud secrets create vertex-ai-key --data-file=- <<< "your-vertex-ai-key"

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding openai-key \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## ✅ Verification Checklist

### Infrastructure Validation

```bash
# Run comprehensive validation
PROJECT_ID=$PROJECT_ID ./scripts/validate-infrastructure.sh
```

**Expected results:**
- ✅ All required APIs enabled
- ✅ Cloud Run services deployed
- ✅ Cloud SQL running with SSL
- ✅ Storage buckets with encryption
- ✅ KMS keys configured
- ✅ Audit logging enabled
- ✅ IAM policies configured

### Security Compliance

```bash
# Run security scan
PROJECT_ID=$PROJECT_ID ./scripts/security-scan.sh
```

**Expected results:**
- ✅ BAA confirmed
- ✅ Encryption at rest (KMS)
- ✅ Encryption in transit (TLS)
- ✅ Audit logs (7-year retention)
- ✅ Access controls (IAM)
- ✅ Network security (VPC)
- ✅ Backups enabled
- ✅ DLP configured

### Application Testing

```bash
# Get service URLs
BACKEND_URL=$(gcloud run services describe revclear-backend-prod --region=us-central1 --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe revclear-frontend-prod --region=us-central1 --format='value(status.url)')

echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"

# Test endpoints
curl -f $BACKEND_URL/health
curl -f $FRONTEND_URL
```

---

## 🔄 CI/CD Setup (Optional)

Enable automated deployments via GitHub Actions:

### 1. Configure Workload Identity

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create github-actions \
  --location="global" \
  --display-name="GitHub Actions"

# Create workload identity provider
gcloud iam workload-identity-pools providers create-oidc github \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create service account for deployments
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions Deployment"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Bind workload identity
gcloud iam service-accounts add-iam-policy-binding github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/attribute.repository/hpppm/revclear"
```

### 2. Configure GitHub Secrets

In your GitHub repository, go to Settings → Secrets and add:

- `GCP_PROJECT_ID`: Your project ID
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: Full provider name from above
- `GCP_SERVICE_ACCOUNT`: `github-actions-sa@$PROJECT_ID.iam.gserviceaccount.com`

### 3. Enable Workflow

The workflow `.github/workflows/deploy-gcp.yml` is already configured and will:
1. Run security scan
2. Plan Terraform changes
3. Deploy infrastructure
4. Build and deploy applications
5. Validate deployment

---

## 💰 Cost Monitoring

### View Current Costs

```bash
# Check billing
gcloud billing accounts list

# View project costs (console)
# https://console.cloud.google.com/billing/YOUR_BILLING_ACCOUNT/reports?project=$PROJECT_ID
```

### Monthly Cost Estimates

| Environment | Estimated Cost | Notes |
|------------|----------------|-------|
| **Development** | $200-300/month | Minimal instances, low traffic |
| **Staging** | $400-600/month | Testing environment |
| **Production** | $800-1500/month | Full features, high availability |

**Included HIPAA costs:**
- Audit logging: $10-30/month
- KMS encryption: $5/month
- DLP scanning: $20-50/month
- 7-year retention: $20-40/month

### Cost Optimization

See `cost-optimization-report.md` (generated by cost monitoring setup) for:
- Detailed cost breakdown
- Optimization strategies
- Free tier usage
- Committed use discounts

---

## 🆘 Troubleshooting

### Deployment fails with permission errors

**Solution:**
```bash
# Verify you have necessary roles
gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:YOUR_EMAIL"

# Grant owner role if needed
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/owner"
```

### BAA not signed

**Error:** "HIPAA BAA must be signed before processing PHI"

**Solution:**
1. Contact Google Cloud sales
2. Sign BAA agreement
3. Wait for processing (1-2 days)
4. Verify in console

### Terraform state locked

**Solution:**
```bash
cd terraform
terraform force-unlock LOCK_ID
```

### API enablement fails

**Solution:**
```bash
# Enable APIs one at a time
gcloud services enable compute.googleapis.com
gcloud services enable run.googleapis.com
# ... etc
```

### Cloud Run deployment fails

**Check logs:**
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

---

## 📚 Next Steps

1. **Review Documentation:**
   - [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) - Compliance requirements
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide
   - [scripts/README.md](scripts/README.md) - Script documentation

2. **Security Hardening:**
   - Enable VPC Service Controls
   - Configure Cloud Armor WAF
   - Set up DLP scanning
   - Review IAM policies

3. **Monitoring:**
   - Create custom dashboards
   - Set up additional alerts
   - Configure uptime checks
   - Enable error reporting

4. **Testing:**
   - Load testing
   - Security testing
   - Disaster recovery testing
   - Backup restoration testing

5. **Compliance:**
   - Complete HIPAA risk assessment
   - Document security controls
   - Train workforce on policies
   - Schedule regular audits

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ All infrastructure validation tests pass
- ✅ Security scan shows no critical issues
- ✅ Applications are accessible via HTTPS
- ✅ Database connections work
- ✅ Authentication is configured
- ✅ Audit logging is enabled
- ✅ Backups are running
- ✅ Monitoring is active
- ✅ BAA is signed and documented

---

## 📞 Support

**Technical Issues:**
- Review logs: `gcloud logging read`
- Check status: https://status.cloud.google.com
- GCP Support: https://cloud.google.com/support

**Security Questions:**
- Email: security@revclear.com
- Review: [HIPAA_SECURITY_POLICIES.md](HIPAA_SECURITY_POLICIES.md)

**Billing Questions:**
- Console: https://console.cloud.google.com/billing
- Support: https://cloud.google.com/billing/docs/how-to/get-support

---

**Deployment Time:** 20-30 minutes  
**Skill Level:** Intermediate  
**Cost:** $200-1500/month (varies by usage)  
**HIPAA Compliant:** ✅ Yes (with BAA signed)

---

*Last Updated: November 2, 2025*  
*Version: 1.0.0*
