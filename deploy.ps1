# Quick Setup Script for RevClear Deployment
# Run this script to deploy to Google Cloud

# Configuration
$PROJECT_ID = "revclear-prod"  # Change this to your project ID
$REGION = "us-central1"
$ENVIRONMENT = "prod"

Write-Host "🚀 RevClear Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install" -ForegroundColor Red
    exit 1
}

# Check if terraform is installed
if (!(Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Terraform not found. Please install: https://www.terraform.io/downloads" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Authenticate
Write-Host "Step 1: Authenticating to Google Cloud..." -ForegroundColor Yellow
gcloud auth login
gcloud auth application-default login
gcloud config set project $PROJECT_ID

Write-Host "✅ Authentication complete" -ForegroundColor Green
Write-Host ""

# Create Terraform state bucket
Write-Host "Step 2: Creating Terraform state bucket..." -ForegroundColor Yellow
$bucketName = "$PROJECT_ID-terraform-state"
gsutil mb -p $PROJECT_ID -l $REGION "gs://$bucketName" 2>$null
if ($?) {
    Write-Host "✅ Bucket created: gs://$bucketName" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Bucket already exists" -ForegroundColor Yellow
}
gsutil versioning set on "gs://$bucketName"
Write-Host ""

# Create terraform.tfvars
Write-Host "Step 3: Creating terraform configuration..." -ForegroundColor Yellow
cd terraform
@"
project_id   = "$PROJECT_ID"
region       = "$REGION"
environment  = "$ENVIRONMENT"
domain_name  = "revclear.health"
"@ | Out-File -FilePath "terraform.tfvars" -Encoding UTF8

Write-Host "✅ Configuration created" -ForegroundColor Green
Write-Host ""

# Initialize Terraform
Write-Host "Step 4: Initializing Terraform..." -ForegroundColor Yellow
terraform init

if ($?) {
    Write-Host "✅ Terraform initialized" -ForegroundColor Green
} else {
    Write-Host "❌ Terraform initialization failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Plan deployment
Write-Host "Step 5: Planning infrastructure deployment..." -ForegroundColor Yellow
terraform plan -out=tfplan

if ($?) {
    Write-Host "✅ Plan created successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Planning failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Confirm deployment
Write-Host "⚠️ Ready to deploy infrastructure to Google Cloud" -ForegroundColor Yellow
Write-Host "This will create:" -ForegroundColor Yellow
Write-Host "  - Cloud Run services" -ForegroundColor White
Write-Host "  - Cloud SQL database" -ForegroundColor White
Write-Host "  - Cloud Storage buckets" -ForegroundColor White
Write-Host "  - VPC network" -ForegroundColor White
Write-Host "  - BigQuery datasets" -ForegroundColor White
Write-Host "  - And more..." -ForegroundColor White
Write-Host ""
Write-Host "Estimated cost: \$50-100/month for dev, \$300-500/month for prod" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Do you want to proceed with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Apply Terraform
Write-Host ""
Write-Host "Step 6: Deploying infrastructure (this takes 10-15 minutes)..." -ForegroundColor Yellow
terraform apply tfplan

if ($?) {
    Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

# Save outputs
terraform output > ../terraform-outputs.txt
Write-Host "✅ Outputs saved to terraform-outputs.txt" -ForegroundColor Green
Write-Host ""

# Display next steps
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build and deploy Docker containers:" -ForegroundColor White
Write-Host "   cd ..\backend" -ForegroundColor Gray
Write-Host "   gcloud builds submit --tag gcr.io/$PROJECT_ID/revclear-api:latest" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Set up database schema:" -ForegroundColor White
Write-Host "   See database/schema.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure Firebase authentication" -ForegroundColor White
Write-Host ""
Write-Host "4. Get your frontend URL:" -ForegroundColor White
$frontendUrl = terraform output -raw frontend_url 2>$null
if ($frontendUrl) {
    Write-Host "   $frontendUrl" -ForegroundColor Green
}
Write-Host ""
Write-Host "📖 Full documentation: DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host "💼 Business model: BUSINESS_MODEL.md" -ForegroundColor Cyan
Write-Host ""
