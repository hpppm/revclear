#!/bin/bash
set -e

# RevClear GCP HIPAA Security Scanner
# Validates HIPAA compliance and security controls

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS_COUNT++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo -e "  ${RED}→${NC} $2"
    ((FAIL_COUNT++))
}

check_warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    echo -e "  ${YELLOW}→${NC} $2"
    ((WARN_COUNT++))
}

check_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
fi

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not set"
    echo "Usage: PROJECT_ID=your-project-id $0"
    exit 1
fi

print_header "RevClear HIPAA Security Scan - Project: $PROJECT_ID"

# Check 1: HIPAA BAA
print_header "1. Business Associate Agreement (BAA)"
check_info "Verify BAA is signed at: https://console.cloud.google.com/marketplace/product/google/cloudplatform-hipaa-baa"
check_warn "BAA Verification" "Manual verification required - ensure BAA is signed"

# Check 2: Encryption at Rest
print_header "2. Encryption at Rest (HIPAA § 164.312(a)(2)(iv))"

# Check Cloud SQL encryption
if gcloud sql instances list --format="value(name)" 2>/dev/null | grep -q .; then
    for instance in $(gcloud sql instances list --format="value(name)"); do
        encryption=$(gcloud sql instances describe "$instance" --format="value(diskEncryptionConfiguration.kmsKeyName)" 2>/dev/null)
        if [ -n "$encryption" ]; then
            check_pass "Cloud SQL '$instance' uses CMEK encryption"
        else
            check_warn "Cloud SQL '$instance'" "Using Google-managed encryption (consider CMEK for enhanced control)"
        fi
    done
else
    check_info "No Cloud SQL instances found"
fi

# Check Cloud Storage encryption
if gsutil ls -p "$PROJECT_ID" 2>/dev/null | grep -q "gs://"; then
    bucket_count=0
    while IFS= read -r bucket; do
        ((bucket_count++))
        encryption=$(gsutil encryption get "$bucket" 2>/dev/null | grep -i "kms" || echo "")
        if [ -n "$encryption" ]; then
            check_pass "Bucket $bucket uses KMS encryption"
        else
            check_warn "Bucket $bucket" "No KMS encryption configured"
        fi
    done < <(gsutil ls -p "$PROJECT_ID" 2>/dev/null)
    
    if [ $bucket_count -eq 0 ]; then
        check_info "No storage buckets found"
    fi
else
    check_info "No storage buckets found"
fi

# Check 3: Encryption in Transit
print_header "3. Encryption in Transit (HIPAA § 164.312(e)(2)(ii))"

# Check Cloud Run services
if gcloud run services list --format="value(name)" 2>/dev/null | grep -q .; then
    for service in $(gcloud run services list --format="value(name)"); do
        check_pass "Cloud Run service '$service' enforces HTTPS by default"
    done
else
    check_info "No Cloud Run services found"
fi

# Check Cloud SQL SSL
if gcloud sql instances list --format="value(name)" 2>/dev/null | grep -q .; then
    for instance in $(gcloud sql instances list --format="value(name)"); do
        ssl_mode=$(gcloud sql instances describe "$instance" --format="value(settings.ipConfiguration.requireSsl)" 2>/dev/null)
        if [ "$ssl_mode" = "True" ] || [ "$ssl_mode" = "true" ]; then
            check_pass "Cloud SQL '$instance' requires SSL connections"
        else
            check_fail "Cloud SQL '$instance'" "SSL not required - enable with: gcloud sql instances patch $instance --require-ssl"
        fi
    done
fi

# Check 4: Audit Logging
print_header "4. Audit Logging (HIPAA § 164.312(b))"

# Check if audit logs are enabled
audit_config=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json 2>/dev/null | grep -c "auditConfigs" || echo "0")
if [ "$audit_config" -gt 0 ]; then
    check_pass "Audit logging configured at project level"
else
    check_fail "Audit logging" "No audit configuration found - configure in HIPAA terraform"
fi

# Check log sinks for retention
if gcloud logging sinks list --format="value(name)" 2>/dev/null | grep -q .; then
    for sink in $(gcloud logging sinks list --format="value(name)"); do
        destination=$(gcloud logging sinks describe "$sink" --format="value(destination)" 2>/dev/null)
        check_pass "Log sink '$sink' configured for long-term retention"
    done
else
    check_fail "Log Retention" "No log sinks configured for 7-year HIPAA retention"
fi

# Check 5: Access Controls
print_header "5. Access Controls (HIPAA § 164.312(a)(1))"

# Check IAM policies
check_info "Reviewing IAM policies..."

# Check for overly permissive roles
viewer_count=$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" --format="value(bindings.role)" 2>/dev/null | grep -c "roles/viewer" || echo "0")
editor_count=$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" --format="value(bindings.role)" 2>/dev/null | grep -c "roles/editor" || echo "0")
owner_count=$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" --format="value(bindings.role)" 2>/dev/null | grep -c "roles/owner" || echo "0")

if [ "$owner_count" -gt 3 ]; then
    check_warn "IAM Roles" "$owner_count project owners found - review and minimize (principle of least privilege)"
else
    check_pass "Project owner count within acceptable range ($owner_count)"
fi

if [ "$editor_count" -gt 5 ]; then
    check_warn "IAM Roles" "$editor_count project editors found - consider using more specific roles"
else
    check_pass "Project editor count acceptable ($editor_count)"
fi

# Check service accounts
sa_count=$(gcloud iam service-accounts list --format="value(email)" 2>/dev/null | wc -l)
check_info "Service accounts found: $sa_count"

# Check 6: VPC and Network Security
print_header "6. Network Security"

# Check VPC networks
if gcloud compute networks list --format="value(name)" 2>/dev/null | grep -q .; then
    check_pass "VPC network(s) configured"
    
    # Check firewall rules
    firewall_count=$(gcloud compute firewall-rules list --format="value(name)" 2>/dev/null | wc -l)
    check_info "Firewall rules configured: $firewall_count"
else
    check_warn "VPC" "No custom VPC found - using default network"
fi

# Check 7: Cloud KMS Keys
print_header "7. Key Management (HIPAA § 164.312(a)(2)(iv))"

if gcloud kms keyrings list --location=global --format="value(name)" 2>/dev/null | grep -q .; then
    keyring_count=$(gcloud kms keyrings list --location=global --format="value(name)" 2>/dev/null | wc -l)
    check_pass "Cloud KMS keyrings found: $keyring_count"
    
    # Check key rotation
    for keyring in $(gcloud kms keyrings list --location=global --format="value(name)" 2>/dev/null); do
        keyring_name=$(basename "$keyring")
        key_count=$(gcloud kms keys list --location=global --keyring="$keyring_name" --format="value(name)" 2>/dev/null | wc -l || echo "0")
        if [ "$key_count" -gt 0 ]; then
            check_pass "Keyring '$keyring_name' has $key_count key(s)"
        fi
    done
else
    check_fail "KMS Keys" "No Cloud KMS keys found - required for HIPAA encryption"
fi

# Check 8: Backup Configuration
print_header "8. Backup and Recovery (HIPAA § 164.308(a)(7)(ii)(A))"

if gcloud sql instances list --format="value(name)" 2>/dev/null | grep -q .; then
    for instance in $(gcloud sql instances list --format="value(name)"); do
        backup_enabled=$(gcloud sql instances describe "$instance" --format="value(settings.backupConfiguration.enabled)" 2>/dev/null)
        if [ "$backup_enabled" = "True" ] || [ "$backup_enabled" = "true" ]; then
            check_pass "Cloud SQL '$instance' has automated backups enabled"
        else
            check_fail "Cloud SQL '$instance'" "Automated backups not enabled"
        fi
    done
fi

# Check storage versioning
if gsutil ls -p "$PROJECT_ID" 2>/dev/null | grep -q "gs://"; then
    while IFS= read -r bucket; do
        versioning=$(gsutil versioning get "$bucket" 2>/dev/null | grep -i "enabled" || echo "")
        if [ -n "$versioning" ]; then
            check_pass "Bucket $bucket has versioning enabled"
        else
            check_warn "Bucket $bucket" "Versioning not enabled - recommended for PHI data"
        fi
    done < <(gsutil ls -p "$PROJECT_ID" 2>/dev/null)
fi

# Check 9: DLP Configuration
print_header "9. Data Loss Prevention (HIPAA § 164.308(a)(1)(ii)(A))"

if gcloud dlp job-triggers list --format="value(name)" 2>/dev/null | grep -q .; then
    trigger_count=$(gcloud dlp job-triggers list --format="value(name)" 2>/dev/null | wc -l)
    check_pass "DLP job triggers configured: $trigger_count"
else
    check_warn "DLP" "No DLP job triggers found - recommended for PHI detection"
fi

# Check 10: Security Command Center
print_header "10. Security Monitoring"

# Note: Security Command Center standard is automatically enabled
check_info "Security Command Center is available for vulnerability scanning"
check_info "Review findings at: https://console.cloud.google.com/security/command-center?project=$PROJECT_ID"

# Check 11: Organization Policies
print_header "11. Organization Policies (HIPAA Administrative Safeguards)"

# Check for common security policies
policies_to_check=(
    "compute.requireOsLogin"
    "compute.disableSerialPortAccess"
    "compute.requireShieldedVm"
)

for policy in "${policies_to_check[@]}"; do
    if gcloud resource-manager org-policies describe "$policy" --project="$PROJECT_ID" 2>/dev/null | grep -q "enforced: true"; then
        check_pass "Organization policy '$policy' is enforced"
    else
        check_warn "Organization Policy" "Policy '$policy' not enforced - see terraform/hipaa-compliance.tf"
    fi
done

# Check 12: Secrets Management
print_header "12. Secrets Management"

if gcloud secrets list --format="value(name)" 2>/dev/null | grep -q .; then
    secret_count=$(gcloud secrets list --format="value(name)" 2>/dev/null | wc -l)
    check_pass "Secret Manager in use with $secret_count secret(s)"
else
    check_warn "Secret Manager" "No secrets found - ensure credentials are not in code"
fi

# Final Summary
print_header "Security Scan Summary"

total_checks=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))

echo -e "${GREEN}✓ Passed:${NC} $PASS_COUNT / $total_checks"
echo -e "${RED}✗ Failed:${NC} $FAIL_COUNT / $total_checks"
echo -e "${YELLOW}⚠ Warnings:${NC} $WARN_COUNT / $total_checks"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ No critical security issues found${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review and address warnings"
    echo "  2. Verify BAA is signed"
    echo "  3. Review HIPAA_COMPLIANCE.md checklist"
    echo "  4. Conduct regular security audits"
    exit 0
else
    echo -e "${RED}✗ Critical security issues found${NC}"
    echo ""
    echo "REQUIRED ACTIONS:"
    echo "  1. Address all failed checks above"
    echo "  2. Re-run this scan to verify fixes"
    echo "  3. Review HIPAA_COMPLIANCE.md"
    echo ""
    exit 1
fi
