# RevClear - Automated CI/CD Setup with Infrastructure Manager

This guide explains how to set up automated deployments using Google Cloud's Infrastructure Manager and Cloud Build.

## 🎯 What This Does

When you set up this automation:

✅ **Pull Request (PR) → Preview Deployment**
- Someone creates a PR with infrastructure changes
- Cloud Build automatically runs `terraform plan`
- Shows what will change (preview)
- Comments on the PR with the plan

✅ **Merge to Main → Automatic Deployment**
- PR gets merged to `main` branch
- Cloud Build automatically runs `terraform apply`
- Infrastructure gets deployed/updated
- No manual deployment needed!

---

## 📋 Prerequisites

1. **Google Cloud Project** with billing enabled
2. **GitHub repository**: https://github.com/hpppm/revclear
3. **Permissions**: You need `roles/config.admin` and `roles/owner`
4. **Terraform state bucket** (created by deploy.ps1)

---

## 🚀 Setup Steps (15 minutes)

### Step 1: Install Cloud Build GitHub App

1. Go to: https://github.com/apps/google-cloud-build
2. Click **"Install"**
3. Choose your account (`hpppm`) or organization
4. Select **"Only select repositories"** → Choose `revclear`
5. Click **"Install"**
6. **Save the Installation ID** (you'll see it in the URL after install)
   - Example URL: `https://github.com/settings/installations/12345678`
   - Installation ID: `12345678`

### Step 2: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Set token name: `revclear-cloud-build`
4. Set expiration: **"No expiration"** (important!)
5. Select permissions:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:user` (Read user profile data)
   - ✅ `read:org` (if repository is in an organization)
6. Click **"Generate token"**
7. **Copy the token immediately** (you won't see it again!)
   - Example: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Configure Terraform Variables

Create a `terraform.tfvars` file in the `terraform/` directory:

```hcl
# terraform/terraform.tfvars

project_id   = "revclear-prod"
region       = "us-central1"
environment  = "prod"

# GitHub Integration
github_app_installation_id   = "12345678"  # From Step 1
github_personal_access_token = "ghp_xxxxx" # From Step 2
```

⚠️ **Security**: Don't commit this file! It's already in `.gitignore`.

### Step 4: Deploy Infrastructure Manager

```powershell
cd terraform

# Initialize with new modules
terraform init -upgrade

# Preview what will be created
terraform plan

# Deploy Infrastructure Manager automation
terraform apply

# Save outputs
terraform output > ../cloudbuild-outputs.txt
```

This creates:
- Cloud Build GitHub connection
- 2 Cloud Build triggers (preview + deploy)
- Service accounts with proper permissions
- Secret Manager entry for GitHub token

### Step 5: Verify Setup

```powershell
# List Cloud Build triggers
gcloud builds triggers list

# You should see:
# - revclear-prod-preview-trigger (runs on PRs)
# - revclear-prod-apply-trigger (runs on merge)

# Test the connection
gcloud builds triggers describe revclear-prod-preview-trigger
```

---

## 🔄 How It Works

### Workflow Diagram:

```
Developer
    │
    ├── Creates Pull Request
    │        │
    │        ▼
    │   Cloud Build Trigger
    │        │
    │        ├── terraform init
    │        ├── terraform validate  
    │        ├── terraform plan
    │        │
    │        ▼
    │   Comments on PR with plan
    │        │
    │        ▼
    │   Developer reviews & approves
    │        │
    ├── Merges Pull Request
    │        │
    │        ▼
    │   Cloud Build Trigger
    │        │
    │        ├── terraform init
    │        ├── terraform plan
    │        ├── terraform apply
    │        │
    │        ▼
    │   Infrastructure Updated!
```

### Example: Making a Change

**1. Create a feature branch:**
```powershell
git checkout -b feature/add-storage-bucket
```

**2. Edit Terraform (e.g., add a bucket):**
```hcl
# terraform/storage.tf
resource "google_storage_bucket" "new_bucket" {
  name     = "${var.project_id}-new-bucket"
  location = var.region
}
```

**3. Commit and push:**
```powershell
git add terraform/storage.tf
git commit -m "feat: add new storage bucket"
git push origin feature/add-storage-bucket
```

**4. Create Pull Request on GitHub:**
- Go to: https://github.com/hpppm/revclear/pulls
- Click **"New pull request"**
- Select your branch
- Click **"Create pull request"**

**5. Cloud Build Runs Automatically:**
- Check: https://console.cloud.google.com/cloud-build/builds
- See the plan in the PR comments
- Review what will change

**6. Merge the PR:**
- Click **"Merge pull request"**
- Cloud Build automatically deploys!

**7. Verify deployment:**
```powershell
# Check the build
gcloud builds list --limit=5

# Verify the bucket was created
gsutil ls gs://
```

---

## 📊 Monitoring Deployments

### View Build History:
```powershell
# List recent builds
gcloud builds list --limit=10

# View specific build
gcloud builds describe BUILD_ID

# Stream logs
gcloud builds log BUILD_ID --stream
```

### In Google Cloud Console:
1. Go to: https://console.cloud.google.com/cloud-build/builds
2. See all triggered builds
3. Click any build to see:
   - Terraform plan output
   - Apply results
   - Errors (if any)

---

## 🔐 Security Best Practices

### Branch Protection Rules:

Set up in GitHub: https://github.com/hpppm/revclear/settings/branches

1. **Protect `main` branch:**
   - ✅ Require pull request reviews (at least 1 approval)
   - ✅ Require status checks (Cloud Build must pass)
   - ✅ Require branches to be up to date
   - ✅ Do not allow bypassing

2. **This ensures:**
   - No direct commits to main
   - All changes reviewed
   - Terraform plan always runs first
   - Failed builds block merges

### Secret Management:

```powershell
# GitHub token is stored in Secret Manager
gcloud secrets list

# View secret metadata (not the value)
gcloud secrets describe github-token-revclear

# Rotate token if compromised
# 1. Generate new token in GitHub
# 2. Update secret
gcloud secrets versions add github-token-revclear --data-file=token.txt
```

---

## 🐛 Troubleshooting

### Issue: Build fails with "permission denied"

**Solution:**
```powershell
# Grant permissions to Cloud Build service account
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cloudbuild-infra-manager@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"
```

### Issue: GitHub connection fails

**Solution:**
```powershell
# Verify GitHub App is installed
# Go to: https://github.com/settings/installations

# Recreate the connection
gcloud builds connections delete github-connection-revclear
# Then re-run terraform apply
```

### Issue: Terraform state locked

**Solution:**
```powershell
# Force unlock (use carefully!)
terraform force-unlock LOCK_ID

# Or delete state lock manually
gsutil rm gs://revclear-terraform-state/terraform/state/default.tflock
```

---

## 💡 Advanced Configuration

### Custom Build Steps:

Edit `cloudbuild.yaml` to add custom steps:

```yaml
steps:
  # Add tests before deployment
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'run-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        echo "Running pre-deployment tests..."
        # Your tests here
  
  # Existing terraform steps...
  - name: 'hashicorp/terraform:1.5'
    id: 'terraform-plan'
    # ...
```

### Deploy to Multiple Environments:

```yaml
# cloudbuild-dev.yaml (for dev branch)
substitutions:
  _ENVIRONMENT: 'dev'

# cloudbuild-prod.yaml (for main branch)
substitutions:
  _ENVIRONMENT: 'prod'
```

### Slack Notifications:

```yaml
# Add to cloudbuild.yaml
- name: 'gcr.io/cloud-builders/gcloud'
  id: 'notify-slack'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      curl -X POST SLACK_WEBHOOK_URL \
        -H 'Content-Type: application/json' \
        -d '{"text":"Deployment complete!"}'
```

---

## 📈 Cost Optimization

### Build Costs:

- **First 120 build-minutes/day**: FREE
- **Additional minutes**: $0.003/minute
- **Your usage**: ~10-20 builds/day × 5 min = 50-100 min/day
- **Cost**: FREE (within free tier!)

### Storage Costs:

- Build logs: ~$0.50/month
- Terraform state: ~$0.01/month

**Total CI/CD Cost: ~$0.50/month** (essentially free!)

---

## 🎯 Next Steps

Once setup is complete:

1. ✅ Test with a sample PR
2. ✅ Set up branch protection rules
3. ✅ Document your team's PR workflow
4. ✅ Add deployment notifications (Slack/Email)
5. ✅ Set up monitoring alerts

---

## 📚 Resources

- **Infrastructure Manager Docs**: https://cloud.google.com/infrastructure-manager/docs
- **Cloud Build Triggers**: https://cloud.google.com/build/docs/automating-builds
- **GitHub Integration**: https://cloud.google.com/build/docs/automating-builds/github/build-repos-from-github
- **im_cloudbuild_workspace Module**: https://registry.terraform.io/modules/terraform-google-modules/bootstrap/google/latest/submodules/im_cloudbuild_workspace

---

## 🤝 Team Workflow

### For You (Owner):
1. Review PRs with infrastructure changes
2. Check Terraform plans before approving
3. Merge approved PRs
4. Monitor deployments in Cloud Build

### For Your Partner:
1. Create feature branches
2. Make infrastructure changes
3. Push and create PR
4. Wait for Cloud Build preview
5. Request your review
6. You merge after approval

**Benefits:**
- ✅ No manual `terraform apply` needed
- ✅ Always see changes before deployment
- ✅ Audit trail of all infrastructure changes
- ✅ Rollback by reverting commits
- ✅ Safe collaboration

---

**Deployment Status**: Once set up, every merge to `main` automatically deploys! 🚀
