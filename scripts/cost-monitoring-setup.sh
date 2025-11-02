#!/bin/bash
set -e

# RevClear GCP Cost Monitoring and Budget Setup
# Configures budget alerts and cost tracking for HIPAA-compliant deployment

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
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

# Get project configuration
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
fi

if [ -z "$PROJECT_ID" ]; then
    read -p "Enter GCP Project ID: " PROJECT_ID
fi

print_header "RevClear GCP Cost Monitoring Setup - Project: $PROJECT_ID"

# Get billing account
print_info "Fetching billing account..."
BILLING_ACCOUNT=$(gcloud billing projects describe "$PROJECT_ID" --format="value(billingAccountName)" 2>/dev/null)

if [ -z "$BILLING_ACCOUNT" ]; then
    print_error "No billing account linked to project"
    echo "Please link a billing account first:"
    echo "  https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    exit 1
fi

BILLING_ACCOUNT_ID=$(echo "$BILLING_ACCOUNT" | sed 's|billingAccounts/||')
print_success "Billing Account: $BILLING_ACCOUNT_ID"

# Get environment
read -p "Enter environment (dev/staging/prod) [prod]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-prod}

# Set budget amounts based on environment
case $ENVIRONMENT in
    dev)
        MONTHLY_BUDGET=200
        ALERT_THRESHOLD_1=50
        ALERT_THRESHOLD_2=75
        ALERT_THRESHOLD_3=90
        ALERT_THRESHOLD_4=100
        ;;
    staging)
        MONTHLY_BUDGET=500
        ALERT_THRESHOLD_1=50
        ALERT_THRESHOLD_2=75
        ALERT_THRESHOLD_3=90
        ALERT_THRESHOLD_4=100
        ;;
    prod)
        MONTHLY_BUDGET=1000
        ALERT_THRESHOLD_1=50
        ALERT_THRESHOLD_2=75
        ALERT_THRESHOLD_3=90
        ALERT_THRESHOLD_4=100
        ;;
    *)
        print_error "Invalid environment"
        exit 1
        ;;
esac

# Allow custom budget
read -p "Monthly budget in USD [$MONTHLY_BUDGET]: " CUSTOM_BUDGET
MONTHLY_BUDGET=${CUSTOM_BUDGET:-$MONTHLY_BUDGET}

# Get alert email
read -p "Enter email for budget alerts [ops@revclear.com]: " ALERT_EMAIL
ALERT_EMAIL=${ALERT_EMAIL:-ops@revclear.com}

print_header "Budget Configuration"
echo "Environment: $ENVIRONMENT"
echo "Monthly Budget: \$$MONTHLY_BUDGET USD"
echo "Alert Email: $ALERT_EMAIL"
echo ""
echo "Alert Thresholds:"
echo "  - ${ALERT_THRESHOLD_1}% (\$$(($MONTHLY_BUDGET * $ALERT_THRESHOLD_1 / 100)))"
echo "  - ${ALERT_THRESHOLD_2}% (\$$(($MONTHLY_BUDGET * $ALERT_THRESHOLD_2 / 100)))"
echo "  - ${ALERT_THRESHOLD_3}% (\$$(($MONTHLY_BUDGET * $ALERT_THRESHOLD_3 / 100)))"
echo "  - ${ALERT_THRESHOLD_4}% (\$$(($MONTHLY_BUDGET * $ALERT_THRESHOLD_4 / 100)))"
echo ""

read -p "Continue with budget setup? (yes/no): " confirm
if [[ ! "$confirm" =~ ^[Yy][Ee][Ss]$ ]]; then
    print_info "Budget setup cancelled"
    exit 0
fi

# Create notification channel
print_header "Creating Notification Channel"

cat > /tmp/notification-channel.json <<EOF
{
  "type": "email",
  "displayName": "RevClear Budget Alerts - $ENVIRONMENT",
  "labels": {
    "email_address": "$ALERT_EMAIL"
  },
  "enabled": true
}
EOF

# Create or get notification channel
CHANNEL_ID=$(gcloud alpha monitoring channels list \
    --filter="labels.email_address=$ALERT_EMAIL" \
    --format="value(name)" 2>/dev/null | head -1)

if [ -z "$CHANNEL_ID" ]; then
    print_info "Creating new notification channel..."
    CHANNEL_ID=$(gcloud alpha monitoring channels create \
        --channel-content-from-file=/tmp/notification-channel.json \
        --format="value(name)" 2>/dev/null)
    print_success "Notification channel created: $CHANNEL_ID"
else
    print_success "Using existing notification channel: $CHANNEL_ID"
fi

# Create budget
print_header "Creating Budget"

BUDGET_NAME="revclear-${ENVIRONMENT}-monthly-budget"

cat > /tmp/budget.json <<EOF
{
  "displayName": "$BUDGET_NAME",
  "budgetFilter": {
    "projects": ["projects/$PROJECT_ID"],
    "creditTypesTreatment": "INCLUDE_ALL_CREDITS"
  },
  "amount": {
    "specifiedAmount": {
      "currencyCode": "USD",
      "units": "$MONTHLY_BUDGET"
    }
  },
  "thresholdRules": [
    {
      "thresholdPercent": $(echo "scale=2; $ALERT_THRESHOLD_1 / 100" | bc),
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": $(echo "scale=2; $ALERT_THRESHOLD_2 / 100" | bc),
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": $(echo "scale=2; $ALERT_THRESHOLD_3 / 100" | bc),
      "spendBasis": "CURRENT_SPEND"
    },
    {
      "thresholdPercent": $(echo "scale=2; $ALERT_THRESHOLD_4 / 100" | bc),
      "spendBasis": "CURRENT_SPEND"
    }
  ],
  "notificationsRule": {
    "pubsubTopic": "projects/$PROJECT_ID/topics/budget-alerts",
    "schemaVersion": "1.0",
    "monitoringNotificationChannels": ["$CHANNEL_ID"]
  }
}
EOF

# Create Pub/Sub topic for budget alerts
gcloud pubsub topics create budget-alerts --project="$PROJECT_ID" 2>/dev/null || print_info "Pub/Sub topic already exists"

# Create budget using gcloud (requires billing API)
print_info "Creating budget..."

# Note: Budget creation via gcloud requires specific permissions
curl -X POST \
    "https://billingbudgets.googleapis.com/v1/billingAccounts/$BILLING_ACCOUNT_ID/budgets" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d @/tmp/budget.json 2>/dev/null && \
    print_success "Budget created successfully" || \
    print_warning "Budget creation may have failed - verify in console"

# Create cost monitoring dashboard
print_header "Setting Up Cost Monitoring Dashboard"

cat > /tmp/dashboard.json <<EOF
{
  "displayName": "RevClear Cost Monitoring - $ENVIRONMENT",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Monthly Cost Trend",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "86400s",
                    "perSeriesAligner": "ALIGN_SUM"
                  }
                }
              },
              "plotType": "LINE"
            }]
          }
        }
      },
      {
        "width": 6,
        "height": 4,
        "xPos": 6,
        "widget": {
          "title": "Cost by Service",
          "pieChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"global\"",
                  "aggregation": {
                    "alignmentPeriod": "2592000s",
                    "perSeriesAligner": "ALIGN_SUM",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": ["resource.service"]
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=/tmp/dashboard.json 2>/dev/null && \
    print_success "Cost monitoring dashboard created" || \
    print_info "Dashboard may already exist"

# Create cost alert policies
print_header "Creating Cost Alert Policies"

# High cost alert
cat > /tmp/cost-alert-high.json <<EOF
{
  "displayName": "High Daily Cost - $ENVIRONMENT",
  "conditions": [{
    "displayName": "Daily cost exceeds threshold",
    "conditionThreshold": {
      "filter": "resource.type=\"global\"",
      "aggregations": [{
        "alignmentPeriod": "86400s",
        "perSeriesAligner": "ALIGN_SUM"
      }],
      "comparison": "COMPARISON_GT",
      "thresholdValue": $(($MONTHLY_BUDGET / 30)),
      "duration": "0s"
    }
  }],
  "notificationChannels": ["$CHANNEL_ID"],
  "alertStrategy": {
    "autoClose": "604800s"
  }
}
EOF

gcloud alpha monitoring policies create --policy-from-file=/tmp/cost-alert-high.json 2>/dev/null && \
    print_success "High cost alert policy created" || \
    print_info "Alert policy may already exist"

# Print summary
print_header "Cost Monitoring Setup Complete"

print_success "Budget configured: \$$MONTHLY_BUDGET/month"
print_success "Notification channel: $ALERT_EMAIL"
print_success "Alert thresholds: $ALERT_THRESHOLD_1%, $ALERT_THRESHOLD_2%, $ALERT_THRESHOLD_3%, $ALERT_THRESHOLD_4%"

echo ""
print_info "View your budget and costs:"
echo "  Budget: https://console.cloud.google.com/billing/$BILLING_ACCOUNT_ID/budgets"
echo "  Costs: https://console.cloud.google.com/billing/$BILLING_ACCOUNT_ID/reports?project=$PROJECT_ID"
echo "  Dashboard: https://console.cloud.google.com/monitoring/dashboards?project=$PROJECT_ID"

echo ""
print_info "Cost optimization tips:"
echo "  1. Review Cloud Run auto-scaling settings"
echo "  2. Use Cloud Storage lifecycle policies for old data"
echo "  3. Consider committed use discounts for prod"
echo "  4. Monitor BigQuery query costs"
echo "  5. Use Cloud SQL maintenance windows effectively"

echo ""
print_warning "HIPAA Compliance Note:"
echo "  - Don't disable audit logging to save costs"
echo "  - Maintain 7-year log retention (required)"
echo "  - Keep backups enabled (required)"
echo "  - Encryption overhead is minimal and required"

# Create cost optimization report
print_header "Generating Cost Optimization Report"

cat > cost-optimization-report.md <<EOF
# RevClear GCP Cost Optimization Report
**Project:** $PROJECT_ID  
**Environment:** $ENVIRONMENT  
**Monthly Budget:** \$$MONTHLY_BUDGET USD  
**Generated:** $(date)

## Current Configuration

### Budget Alerts
- 50% threshold: \$$(($MONTHLY_BUDGET * 50 / 100))
- 75% threshold: \$$(($MONTHLY_BUDGET * 75 / 100))
- 90% threshold: \$$(($MONTHLY_BUDGET * 90 / 100))
- 100% threshold: \$$(($MONTHLY_BUDGET))

### Estimated Monthly Costs (HIPAA-Compliant)

| Service | Estimated Cost | Notes |
|---------|----------------|-------|
| **Cloud Run** | \$50-150 | Scales with traffic |
| **Cloud SQL** | \$25-200 | Based on instance size |
| **Cloud Storage** | \$20-50 | 7-year retention lifecycle |
| **Audit Logs** | \$5-20 | 7-year retention required |
| **KMS Encryption** | \$5 | 5 keys |
| **DLP Scanning** | \$10-50 | PHI detection |
| **Networking** | \$20-40 | Load balancer + egress |
| **Vertex AI** | \$20-100 | Per API calls |
| **Speech-to-Text** | \$50 | Medical transcription |
| **BigQuery** | \$10-50 | Analytics queries |
| **Monitoring** | \$5-10 | Alerts and dashboards |
| **Total** | **\$220-770** | Varies by usage |

## Cost Optimization Strategies

### Short-term (Immediate)
1. **Cloud Run:** Set min instances to 0 in dev/staging
2. **Cloud SQL:** Use smallest instance in dev (db-f1-micro)
3. **Storage:** Enable lifecycle management (Standard → Nearline → Coldline)
4. **BigQuery:** Optimize queries, use partitioning

### Medium-term (1-3 months)
1. **Committed Use Discounts:** 1-year commit for prod (30% savings)
2. **Cloud CDN:** Cache static assets
3. **Preemptible VMs:** For batch processing (if any)
4. **Reserved IPs:** Convert to static if needed

### Long-term (3-6 months)
1. **Sustained Use Discounts:** Automatic for consistent usage
2. **Enterprise Discount:** Negotiate with Google sales
3. **Multi-region strategy:** Evaluate cost vs availability needs
4. **Containerization:** Optimize image sizes

## HIPAA Cost Requirements (Cannot Reduce)

❌ **Do NOT disable these to save costs:**
- Audit logging (7-year retention)
- Encryption at rest (KMS keys)
- Encryption in transit (TLS)
- Backup and recovery
- DLP scanning for PHI
- Security monitoring

✅ **Safe optimizations:**
- Right-size compute resources
- Use lifecycle policies for storage
- Optimize database queries
- Enable auto-scaling properly
- Use caching where appropriate

## Monthly Review Checklist

- [ ] Review actual vs budgeted costs
- [ ] Identify top 3 cost drivers
- [ ] Check for unused resources
- [ ] Verify auto-scaling is working
- [ ] Review BigQuery query costs
- [ ] Check storage lifecycle rules
- [ ] Evaluate commitment discounts
- [ ] Update budget if needed

## Resources

- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [Cost Optimization Best Practices](https://cloud.google.com/architecture/framework/cost-optimization)
- [HIPAA Compliance Guide](./HIPAA_COMPLIANCE.md)

---
*Generated by cost-monitoring-setup.sh*
EOF

print_success "Cost optimization report saved to: cost-optimization-report.md"

# Cleanup temporary files
rm -f /tmp/budget.json /tmp/notification-channel.json /tmp/dashboard.json /tmp/cost-alert-high.json

print_header "Setup Complete"
print_success "Budget monitoring configured successfully!"
echo ""
