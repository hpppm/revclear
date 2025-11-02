#!/bin/bash
set -e

# RevClear GCP HIPAA-Compliant Deployment Script
# This script automates the deployment of RevClear on Google Cloud Platform
# with full HIPAA compliance controls

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    if ! command -v gcloud &> /dev/null; then
        missing_tools+=("gcloud")
    fi
    
    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi
    
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install:"
        for tool in "${missing_tools[@]}"; do
            case $tool in
                gcloud)
                    echo "  - Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
                    ;;
                terraform)
                    echo "  - Terraform: https://www.terraform.io/downloads"
                    ;;
                git)
                    echo "  - Git: https://git-scm.com/downloads"
                    ;;
            esac
        done
        exit 1
    fi
    
    print_success "All prerequisites installed"
}

# Verify HIPAA BAA
verify_baa() {
    print_header "HIPAA Business Associate Agreement (BAA) Verification"
    
    echo ""
    print_warning "CRITICAL: Before deploying ANY system that handles PHI, you MUST:"
    echo "  1. Sign Google Cloud's Business Associate Agreement (BAA)"
    echo "  2. Only use BAA-covered services for PHI"
    echo ""
    echo "To sign the BAA:"
    echo "  1. Go to: https://console.cloud.google.com/marketplace/product/google/cloudplatform-hipaa-baa"
    echo "  2. Or contact Google Cloud sales"
    echo ""
    read -p "Have you signed Google Cloud's HIPAA BAA? (yes/no): " baa_signed
    
    if [[ ! "$baa_signed" =~ ^[Yy][Ee][Ss]$ ]]; then
        print_error "You MUST sign the BAA before deploying. This is a legal requirement."
        print_info "Visit: https://cloud.google.com/security/compliance/hipaa-compliance"
        exit 1
    fi
    
    print_success "BAA confirmed"
}

# Get deployment configuration
get_config() {
    print_header "Deployment Configuration"
    
    # Project ID
    if [ -z "$PROJECT_ID" ]; then
        read -p "Enter GCP Project ID [revclear-prod]: " PROJECT_ID
        PROJECT_ID=${PROJECT_ID:-revclear-prod}
    fi
    export PROJECT_ID
    
    # Region
    if [ -z "$REGION" ]; then
        read -p "Enter GCP Region [us-central1]: " REGION
        REGION=${REGION:-us-central1}
    fi
    export REGION
    
    # Environment
    if [ -z "$ENVIRONMENT" ]; then
        read -p "Enter Environment (dev/staging/prod) [prod]: " ENVIRONMENT
        ENVIRONMENT=${ENVIRONMENT:-prod}
    fi
    export ENVIRONMENT
    
    # Domain name
    if [ -z "$DOMAIN_NAME" ]; then
        read -p "Enter Domain Name [revclear.health]: " DOMAIN_NAME
        DOMAIN_NAME=${DOMAIN_NAME:-revclear.health}
    fi
    export DOMAIN_NAME
    
    print_success "Configuration collected"
    echo ""
    print_info "Project ID: $PROJECT_ID"
    print_info "Region: $REGION"
    print_info "Environment: $ENVIRONMENT"
    print_info "Domain: $DOMAIN_NAME"
}

# Authenticate with GCP
authenticate_gcp() {
    print_header "Authenticating with Google Cloud"
    
    # Check if already authenticated
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_success "Already authenticated"
        gcloud config set project "$PROJECT_ID" 2>/dev/null || true
        return 0
    fi
    
    print_info "Authenticating..."
    gcloud auth login
    gcloud auth application-default login
    gcloud config set project "$PROJECT_ID"
    
    print_success "Authentication complete"
}

# Verify project and billing
verify_project() {
    print_header "Verifying GCP Project"
    
    # Check if project exists
    if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
        print_warning "Project $PROJECT_ID does not exist"
        read -p "Create project $PROJECT_ID? (yes/no): " create_project
        
        if [[ "$create_project" =~ ^[Yy][Ee][Ss]$ ]]; then
            gcloud projects create "$PROJECT_ID" --name="RevClear $ENVIRONMENT"
            print_success "Project created"
        else
            print_error "Project required for deployment"
            exit 1
        fi
    else
        print_success "Project exists"
    fi
    
    # Verify billing
    if ! gcloud billing projects describe "$PROJECT_ID" &>/dev/null; then
        print_warning "Billing not enabled for project"
        echo "To enable billing:"
        echo "  1. Go to: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
        echo "  2. Link a billing account"
        read -p "Press Enter once billing is enabled..."
    else
        print_success "Billing enabled"
    fi
    
    # Set project
    gcloud config set project "$PROJECT_ID"
    
    # Get project number
    export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
    print_info "Project Number: $PROJECT_NUMBER"
}

# Enable required APIs
enable_apis() {
    print_header "Enabling Required GCP APIs"
    
    local apis=(
        "compute.googleapis.com"
        "run.googleapis.com"
        "speech.googleapis.com"
        "aiplatform.googleapis.com"
        "healthcare.googleapis.com"
        "documentai.googleapis.com"
        "dlp.googleapis.com"
        "sql-component.googleapis.com"
        "sqladmin.googleapis.com"
        "storage-api.googleapis.com"
        "cloudkms.googleapis.com"
        "secretmanager.googleapis.com"
        "pubsub.googleapis.com"
        "bigquery.googleapis.com"
        "logging.googleapis.com"
        "monitoring.googleapis.com"
        "cloudfunctions.googleapis.com"
        "cloudscheduler.googleapis.com"
        "firebase.googleapis.com"
        "identitytoolkit.googleapis.com"
        "iap.googleapis.com"
        "cloudarmor.googleapis.com"
        "cloudbuild.googleapis.com"
        "securitycenter.googleapis.com"
        "accesscontextmanager.googleapis.com"
        "accessapproval.googleapis.com"
    )
    
    print_info "Enabling ${#apis[@]} APIs (this may take 5-10 minutes)..."
    
    for api in "${apis[@]}"; do
        if gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "$api"; then
            echo "  ✓ $api (already enabled)"
        else
            echo "  → Enabling $api..."
            gcloud services enable "$api" --quiet
        fi
    done
    
    print_success "All APIs enabled"
}

# Create Terraform state bucket
create_state_bucket() {
    print_header "Setting Up Terraform State Storage"
    
    local state_bucket="${PROJECT_ID}-terraform-state"
    
    if gsutil ls "gs://$state_bucket" &>/dev/null; then
        print_success "Terraform state bucket exists"
        return 0
    fi
    
    print_info "Creating state bucket: $state_bucket"
    
    gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://$state_bucket"
    gsutil versioning set on "gs://$state_bucket"
    gsutil lifecycle set - "gs://$state_bucket" <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 10
        }
      }
    ]
  }
}
EOF
    
    print_success "Terraform state bucket created"
}

# Initialize and apply Terraform
deploy_infrastructure() {
    print_header "Deploying Infrastructure with Terraform"
    
    cd terraform || exit 1
    
    # Create terraform.tfvars if it doesn't exist
    if [ ! -f terraform.tfvars ]; then
        print_info "Creating terraform.tfvars"
        cat > terraform.tfvars <<EOF
project_id   = "$PROJECT_ID"
region       = "$REGION"
environment  = "$ENVIRONMENT"
domain_name  = "$DOMAIN_NAME"
EOF
    fi
    
    # Update backend configuration
    cat > backend-config.hcl <<EOF
bucket = "${PROJECT_ID}-terraform-state"
prefix = "terraform/state"
EOF
    
    print_info "Initializing Terraform..."
    terraform init -backend-config=backend-config.hcl -upgrade
    
    print_info "Validating Terraform configuration..."
    terraform validate
    
    print_info "Planning infrastructure changes..."
    terraform plan -out=tfplan
    
    echo ""
    read -p "Apply Terraform plan? (yes/no): " apply_terraform
    
    if [[ "$apply_terraform" =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Applying Terraform configuration (this may take 15-20 minutes)..."
        terraform apply tfplan
        
        # Save outputs
        terraform output > ../terraform-outputs.txt
        
        print_success "Infrastructure deployed"
    else
        print_warning "Terraform apply skipped"
        cd ..
        return 1
    fi
    
    cd ..
}

# Set up monitoring and alerting
setup_monitoring() {
    print_header "Setting Up Monitoring and Alerting"
    
    print_info "Creating notification channel..."
    
    # Create email notification channel
    read -p "Enter email for alerts [ops@revclear.com]: " alert_email
    alert_email=${alert_email:-ops@revclear.com}
    
    cat > /tmp/notification-channel.json <<EOF
{
  "type": "email",
  "displayName": "RevClear Operations",
  "labels": {
    "email_address": "$alert_email"
  }
}
EOF
    
    gcloud alpha monitoring channels create --channel-content-from-file=/tmp/notification-channel.json \
        --project="$PROJECT_ID" 2>/dev/null || print_warning "Notification channel may already exist"
    
    print_success "Monitoring configured"
}

# Verify deployment
verify_deployment() {
    print_header "Verifying Deployment"
    
    print_info "Checking deployed resources..."
    
    # Check Cloud Run services
    if gcloud run services list --region="$REGION" --format="value(name)" 2>/dev/null | grep -q .; then
        print_success "Cloud Run services deployed"
        gcloud run services list --region="$REGION"
    else
        print_warning "No Cloud Run services found (may need manual deployment)"
    fi
    
    # Check Cloud SQL instances
    if gcloud sql instances list --format="value(name)" 2>/dev/null | grep -q .; then
        print_success "Cloud SQL instances deployed"
        gcloud sql instances list
    else
        print_warning "No Cloud SQL instances found"
    fi
    
    # Check Cloud Storage buckets
    local bucket_count=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null | wc -l)
    if [ "$bucket_count" -gt 0 ]; then
        print_success "Cloud Storage buckets created ($bucket_count buckets)"
    else
        print_warning "No storage buckets found"
    fi
    
    # Check audit logging
    if gcloud logging sinks list --format="value(name)" 2>/dev/null | grep -q .; then
        print_success "Audit logging configured"
    else
        print_warning "Audit logging may not be configured"
    fi
}

# Print next steps
print_next_steps() {
    print_header "Deployment Complete - Next Steps"
    
    echo ""
    print_success "Infrastructure successfully deployed!"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Review deployed resources:"
    echo "   → Console: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
    echo ""
    echo "2. Deploy application code:"
    echo "   → Build and deploy Cloud Run services"
    echo "   → See DEPLOYMENT.md for detailed instructions"
    echo ""
    echo "3. Configure authentication:"
    echo "   → Set up Firebase/Identity Platform users"
    echo "   → Configure OAuth providers if needed"
    echo ""
    echo "4. Set up database schema:"
    echo "   → Connect to Cloud SQL and run migrations"
    echo "   → Import initial data if needed"
    echo ""
    echo "5. Configure custom domain:"
    echo "   → Map domain to Cloud Run services"
    echo "   → Update DNS records"
    echo ""
    echo "6. HIPAA Compliance checklist:"
    echo "   → Verify BAA is signed (REQUIRED)"
    echo "   → Review audit logs configuration"
    echo "   → Test backup and restore procedures"
    echo "   → Document security controls"
    echo "   → Train workforce on HIPAA policies"
    echo ""
    echo "7. Security validation:"
    echo "   → Run security scan: ./scripts/security-scan.sh"
    echo "   → Review HIPAA_COMPLIANCE.md"
    echo "   → Test access controls"
    echo ""
    echo "8. Monitoring setup:"
    echo "   → Create custom dashboards in Cloud Monitoring"
    echo "   → Set up additional alert policies"
    echo "   → Configure uptime checks"
    echo ""
    
    if [ -f terraform-outputs.txt ]; then
        echo "Terraform outputs saved to: terraform-outputs.txt"
        echo ""
    fi
    
    print_info "For detailed deployment guidance, see:"
    echo "  - DEPLOYMENT.md"
    echo "  - HIPAA_COMPLIANCE.md"
    echo "  - PILOT_DEPLOYMENT_GUIDE.md"
    echo ""
}

# Main execution
main() {
    clear
    print_header "RevClear GCP HIPAA-Compliant Deployment"
    echo ""
    echo "This script will:"
    echo "  1. Verify prerequisites and HIPAA BAA"
    echo "  2. Configure GCP project and billing"
    echo "  3. Enable required APIs"
    echo "  4. Deploy infrastructure with Terraform"
    echo "  5. Set up monitoring and alerting"
    echo ""
    read -p "Continue with deployment? (yes/no): " continue_deploy
    
    if [[ ! "$continue_deploy" =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    verify_baa
    get_config
    authenticate_gcp
    verify_project
    enable_apis
    create_state_bucket
    deploy_infrastructure
    setup_monitoring
    verify_deployment
    print_next_steps
    
    print_success "Deployment script completed successfully!"
}

# Run main function
main "$@"
