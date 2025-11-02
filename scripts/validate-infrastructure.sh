#!/bin/bash
set -e

# RevClear Infrastructure Validation and Testing
# Validates deployed GCP infrastructure meets HIPAA requirements

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
    ((TESTS_RUN++))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo -e "  ${RED}→${NC} $2"
    ((TESTS_FAILED++))
    ((TESTS_RUN++))
}

test_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Get configuration
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
fi

if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID not set"
    echo "Usage: PROJECT_ID=your-project-id $0"
    exit 1
fi

if [ -z "$REGION" ]; then
    REGION="us-central1"
fi

print_header "RevClear Infrastructure Validation - Project: $PROJECT_ID"

# Test 1: API Enablement
print_header "Test Suite 1: Required APIs"

required_apis=(
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "storage-api.googleapis.com"
    "cloudkms.googleapis.com"
    "logging.googleapis.com"
    "monitoring.googleapis.com"
    "dlp.googleapis.com"
    "aiplatform.googleapis.com"
)

for api in "${required_apis[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "$api"; then
        test_pass "API $api is enabled"
    else
        test_fail "API $api" "Not enabled - run: gcloud services enable $api"
    fi
done

# Test 2: Cloud Run Services
print_header "Test Suite 2: Cloud Run Services"

if gcloud run services list --region="$REGION" --format="value(name)" 2>/dev/null | grep -q .; then
    for service in $(gcloud run services list --region="$REGION" --format="value(name)"); do
        # Check if service is deployed
        status=$(gcloud run services describe "$service" --region="$REGION" --format="value(status.conditions[0].status)" 2>/dev/null)
        if [ "$status" = "True" ]; then
            test_pass "Cloud Run service '$service' is deployed and ready"
            
            # Check HTTPS enforcement
            url=$(gcloud run services describe "$service" --region="$REGION" --format="value(status.url)" 2>/dev/null)
            if [[ "$url" =~ ^https:// ]]; then
                test_pass "Service '$service' uses HTTPS"
            else
                test_fail "Service '$service'" "Not using HTTPS"
            fi
            
            # Test health endpoint
            if curl -f -s "$url/health" &>/dev/null; then
                test_pass "Service '$service' health check passed"
            else
                test_info "Service '$service' health endpoint not accessible (may not be implemented)"
            fi
        else
            test_fail "Cloud Run service '$service'" "Not ready - status: $status"
        fi
    done
else
    test_info "No Cloud Run services found (may not be deployed yet)"
fi

# Test 3: Cloud SQL
print_header "Test Suite 3: Cloud SQL Database"

if gcloud sql instances list --format="value(name)" 2>/dev/null | grep -q .; then
    for instance in $(gcloud sql instances list --format="value(name)"); do
        # Check instance status
        status=$(gcloud sql instances describe "$instance" --format="value(state)" 2>/dev/null)
        if [ "$status" = "RUNNABLE" ]; then
            test_pass "Cloud SQL instance '$instance' is running"
        else
            test_fail "Cloud SQL instance '$instance'" "Status: $status"
        fi
        
        # Check SSL requirement
        ssl_required=$(gcloud sql instances describe "$instance" --format="value(settings.ipConfiguration.requireSsl)" 2>/dev/null)
        if [ "$ssl_required" = "True" ] || [ "$ssl_required" = "true" ]; then
            test_pass "Cloud SQL '$instance' requires SSL connections"
        else
            test_fail "Cloud SQL '$instance'" "SSL not required (HIPAA violation)"
        fi
        
        # Check backups
        backup_enabled=$(gcloud sql instances describe "$instance" --format="value(settings.backupConfiguration.enabled)" 2>/dev/null)
        if [ "$backup_enabled" = "True" ] || [ "$backup_enabled" = "true" ]; then
            test_pass "Cloud SQL '$instance' has backups enabled"
        else
            test_fail "Cloud SQL '$instance'" "Backups not enabled (HIPAA violation)"
        fi
        
        # Check binary logging for PITR
        binlog_enabled=$(gcloud sql instances describe "$instance" --format="value(settings.backupConfiguration.binaryLogEnabled)" 2>/dev/null)
        if [ "$binlog_enabled" = "True" ] || [ "$binlog_enabled" = "true" ]; then
            test_pass "Cloud SQL '$instance' has binary logging enabled (PITR)"
        else
            test_info "Binary logging not enabled for '$instance' (PITR not available)"
        fi
    done
else
    test_info "No Cloud SQL instances found (may not be deployed yet)"
fi

# Test 4: Cloud Storage
print_header "Test Suite 4: Cloud Storage"

if gsutil ls -p "$PROJECT_ID" 2>/dev/null | grep -q "gs://"; then
    bucket_count=0
    while IFS= read -r bucket; do
        ((bucket_count++))
        bucket_name=$(echo "$bucket" | sed 's|gs://||' | sed 's|/||')
        
        # Check versioning
        versioning=$(gsutil versioning get "gs://$bucket_name" 2>/dev/null | grep -i "enabled" || echo "")
        if [ -n "$versioning" ]; then
            test_pass "Bucket '$bucket_name' has versioning enabled"
        else
            test_fail "Bucket '$bucket_name'" "Versioning not enabled (recommended for HIPAA)"
        fi
        
        # Check lifecycle rules
        lifecycle=$(gsutil lifecycle get "gs://$bucket_name" 2>/dev/null | grep -i "rule" || echo "")
        if [ -n "$lifecycle" ]; then
            test_pass "Bucket '$bucket_name' has lifecycle rules configured"
        else
            test_info "Bucket '$bucket_name' has no lifecycle rules (consider adding for cost optimization)"
        fi
        
        # Check encryption
        encryption=$(gsutil encryption get "gs://$bucket_name" 2>/dev/null || echo "")
        if [[ "$encryption" =~ "kms" ]]; then
            test_pass "Bucket '$bucket_name' uses KMS encryption"
        else
            test_info "Bucket '$bucket_name' uses Google-managed encryption (KMS recommended for HIPAA)"
        fi
    done < <(gsutil ls -p "$PROJECT_ID" 2>/dev/null)
    
    if [ $bucket_count -eq 0 ]; then
        test_info "No storage buckets found"
    fi
else
    test_info "No storage buckets found (may not be deployed yet)"
fi

# Test 5: Cloud KMS
print_header "Test Suite 5: Encryption Key Management"

# Check for keyrings in primary region
if gcloud kms keyrings list --location="$REGION" --format="value(name)" 2>/dev/null | grep -q .; then
    for keyring in $(gcloud kms keyrings list --location="$REGION" --format="value(name)"); do
        keyring_name=$(basename "$keyring")
        test_pass "KMS keyring '$keyring_name' exists in $REGION"
        
        # Check keys in keyring
        key_count=$(gcloud kms keys list --location="$REGION" --keyring="$keyring_name" --format="value(name)" 2>/dev/null | wc -l)
        if [ "$key_count" -gt 0 ]; then
            test_pass "Keyring '$keyring_name' has $key_count key(s)"
            
            # Check key rotation
            for key in $(gcloud kms keys list --location="$REGION" --keyring="$keyring_name" --format="value(name)"); do
                key_name=$(basename "$key")
                rotation=$(gcloud kms keys describe "$key_name" --location="$REGION" --keyring="$keyring_name" --format="value(rotationPeriod)" 2>/dev/null)
                if [ -n "$rotation" ]; then
                    test_pass "Key '$key_name' has automatic rotation configured"
                else
                    test_info "Key '$key_name' does not have automatic rotation (consider enabling)"
                fi
            done
        else
            test_fail "Keyring '$keyring_name'" "No keys found"
        fi
    done
else
    test_fail "Cloud KMS" "No keyrings found in $REGION (required for HIPAA encryption)"
fi

# Test 6: Audit Logging
print_header "Test Suite 6: Audit Logging"

# Check audit log configuration
audit_config=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json 2>/dev/null | grep -c "auditConfigs" || echo "0")
if [ "$audit_config" -gt 0 ]; then
    test_pass "Project-level audit logging is configured"
else
    test_fail "Audit Logging" "No audit configuration found (HIPAA violation)"
fi

# Check log sinks
if gcloud logging sinks list --format="value(name)" 2>/dev/null | grep -q .; then
    sink_count=$(gcloud logging sinks list --format="value(name)" 2>/dev/null | wc -l)
    test_pass "Log sinks configured: $sink_count"
    
    for sink in $(gcloud logging sinks list --format="value(name)"); do
        destination=$(gcloud logging sinks describe "$sink" --format="value(destination)" 2>/dev/null)
        test_info "Log sink '$sink' exports to: $destination"
    done
else
    test_fail "Log Retention" "No log sinks configured (7-year retention required for HIPAA)"
fi

# Test 7: IAM and Access Controls
print_header "Test Suite 7: IAM and Access Controls"

# Check service accounts
sa_count=$(gcloud iam service-accounts list --format="value(email)" 2>/dev/null | wc -l)
if [ "$sa_count" -gt 0 ]; then
    test_pass "Service accounts configured: $sa_count"
else
    test_info "No service accounts found (may not be needed for pilot)"
fi

# Check for overly permissive roles
owner_count=$(gcloud projects get-iam-policy "$PROJECT_ID" --flatten="bindings[].members" --format="value(bindings.role)" 2>/dev/null | grep -c "roles/owner" || echo "0")
if [ "$owner_count" -le 3 ]; then
    test_pass "Project owner count is acceptable ($owner_count)"
else
    test_fail "IAM Roles" "$owner_count project owners found (recommend <= 3)"
fi

# Test 8: Networking
print_header "Test Suite 8: Network Security"

# Check VPC
if gcloud compute networks list --format="value(name)" 2>/dev/null | grep -q .; then
    network_count=$(gcloud compute networks list --format="value(name)" 2>/dev/null | wc -l)
    test_pass "VPC networks configured: $network_count"
    
    # Check firewall rules
    firewall_count=$(gcloud compute firewall-rules list --format="value(name)" 2>/dev/null | wc -l)
    test_info "Firewall rules configured: $firewall_count"
else
    test_info "No custom VPC networks (using default)"
fi

# Test 9: Secret Management
print_header "Test Suite 9: Secret Management"

if gcloud secrets list --format="value(name)" 2>/dev/null | grep -q .; then
    secret_count=$(gcloud secrets list --format="value(name)" 2>/dev/null | wc -l)
    test_pass "Secrets configured in Secret Manager: $secret_count"
    
    # Check secret versions
    for secret in $(gcloud secrets list --format="value(name)" 2>/dev/null | head -3); do
        version_count=$(gcloud secrets versions list "$secret" --format="value(name)" 2>/dev/null | wc -l)
        if [ "$version_count" -gt 0 ]; then
            test_pass "Secret '$secret' has $version_count version(s)"
        fi
    done
else
    test_info "No secrets found in Secret Manager"
fi

# Test 10: Monitoring and Alerting
print_header "Test Suite 10: Monitoring and Alerting"

# Check alert policies
if gcloud alpha monitoring policies list --format="value(name)" 2>/dev/null | grep -q .; then
    policy_count=$(gcloud alpha monitoring policies list --format="value(name)" 2>/dev/null | wc -l)
    test_pass "Alert policies configured: $policy_count"
else
    test_info "No alert policies configured (recommended for production)"
fi

# Check notification channels
if gcloud alpha monitoring channels list --format="value(name)" 2>/dev/null | grep -q .; then
    channel_count=$(gcloud alpha monitoring channels list --format="value(name)" 2>/dev/null | wc -l)
    test_pass "Notification channels configured: $channel_count"
else
    test_info "No notification channels configured"
fi

# Test 11: DLP Configuration
print_header "Test Suite 11: Data Loss Prevention"

if gcloud dlp job-triggers list --format="value(name)" 2>/dev/null | grep -q .; then
    trigger_count=$(gcloud dlp job-triggers list --format="value(name)" 2>/dev/null | wc -l)
    test_pass "DLP job triggers configured: $trigger_count"
else
    test_info "No DLP job triggers configured (recommended for PHI detection)"
fi

# Test 12: Integration Tests
print_header "Test Suite 12: End-to-End Integration"

# Test API connectivity
if gcloud run services list --region="$REGION" --format="value(name)" 2>/dev/null | grep -q "backend"; then
    backend_url=$(gcloud run services describe revclear-backend-prod --region="$REGION" --format="value(status.url)" 2>/dev/null || \
                  gcloud run services describe revclear-backend-dev --region="$REGION" --format="value(status.url)" 2>/dev/null)
    
    if [ -n "$backend_url" ]; then
        test_info "Backend URL: $backend_url"
        
        # Test health endpoint
        if curl -f -s -o /dev/null -w "%{http_code}" "$backend_url/health" 2>/dev/null | grep -q "200"; then
            test_pass "Backend health check returned 200 OK"
        else
            test_info "Backend health check not available"
        fi
    fi
fi

# Test Database connectivity (via Cloud SQL Proxy would require more setup)
test_info "Database connectivity test requires Cloud SQL Proxy (skip for now)"

# Final Summary
print_header "Infrastructure Validation Summary"

success_rate=0
if [ $TESTS_RUN -gt 0 ]; then
    success_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
fi

echo -e "Tests Run:    $TESTS_RUN"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "Success Rate: $success_rate%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Infrastructure is ready for deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Deploy application code to Cloud Run"
    echo "  2. Configure database schema"
    echo "  3. Set up authentication"
    echo "  4. Run security scan: ./scripts/security-scan.sh"
    echo "  5. Perform load testing"
    exit 0
elif [ $TESTS_FAILED -le 3 ]; then
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
    echo ""
    echo "Infrastructure is partially ready."
    echo "Address failed tests before production deployment."
    exit 1
else
    echo -e "${RED}✗ Multiple tests failed${NC}"
    echo ""
    echo "Infrastructure has significant issues."
    echo "Review and fix all failed tests before proceeding."
    exit 1
fi
