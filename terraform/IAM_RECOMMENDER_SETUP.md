# IAM Recommender Automation Setup Guide

**Status:** ✅ Terraform Configuration Complete  
**Date:** November 1, 2025  
**Purpose:** Automated IAM security hardening for HIPAA compliance

---

## 📋 Overview

This guide explains how to enable and configure the IAM Recommender Response playbook in Security Command Center to automatically remove excess permissions and maintain least-privilege access.

**What it does:**
- Scans for unused permissions (90+ days inactive)
- Identifies over-permissioned service accounts
- Automatically removes excess permissions
- Logs all changes to BigQuery for audit review

**HIPAA Compliance:**
- §164.308(a)(3) - Workforce Clearance Procedures
- §164.308(a)(4) - Information Access Management
- §164.312(a)(1) - Unique User Identification

---

## 🚀 Quick Start

### Step 1: Deploy Terraform Infrastructure

```bash
cd terraform
terraform init
terraform plan -var-file="production.tfvars"
terraform apply -var-file="production.tfvars"
```

**Resources Created:**
- ✅ Custom IAM role: `iamRecommenderAutomation`
- ✅ Service account: `iam-recommender-playbook@PROJECT.iam`
- ✅ Workload Identity Pool for SCC integration
- ✅ BigQuery dataset: `iam_audit_analytics`
- ✅ Pub/Sub topic: `iam-permission-changes`
- ✅ APIs enabled: Security Command Center, Recommender, Cloud Asset

### Step 2: Get Service Account Email

After Terraform apply completes, get the service account email:

```bash
terraform output iam_recommender_service_account_email
```

**Example output:**
```
iam-recommender-playbook@your-project-id.iam.gserviceaccount.com
```

**Copy this email** - you'll need it in Step 3.

---

## 🔧 Manual Configuration (Required)

### Step 3: Enable IAM Recommender Playbook

These steps must be done manually in the Security Command Center console:

1. **Open Security Command Center:**
   ```
   https://console.cloud.google.com/security/command-center
   ```

2. **Navigate to Playbooks:**
   - Go to: **Response > Playbooks**
   - In the search field, type: `IAM Recommender`

3. **Open the IAM Recommender Response Playbook:**
   - Click on: **IAM Recommender Response**
   - The playbook editor will open

4. **Enable the Playbook:**
   - In the playbook header, toggle the switch to **ON**
   - Click **Save**

### Step 4: Configure Workload Identity

1. **In the playbook settings, find the integration:**
   - Go to: **Response > Integrations Setup**
   - Search for: `Google Cloud Recommender`
   - Click: ⚙️ **Configure Instance**

2. **Set the Workload Identity Email:**
   - Paste the service account email from Step 2
   - Format: `iam-recommender-playbook@your-project-id.iam.gserviceaccount.com`
   - Click **Save**

### Step 5: Grant Organization-Level Access

The service account needs organization-level permissions to manage IAM policies:

```bash
# Get your organization ID
gcloud organizations list

# Set organization ID variable
ORG_ID="YOUR_ORG_ID"

# Grant the custom role at organization level
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="serviceAccount:iam-recommender-playbook@PROJECT_ID.iam.gserviceaccount.com" \
  --role="organizations/YOUR_ORG_ID/roles/iamRecommenderAutomation"
```

⚠️ **Important:** Replace `YOUR_ORG_ID` and `PROJECT_ID` with your actual values.

---

## ⚙️ Configuration Options

### Option A: Manual Approval Mode (Default - Recommended)

By default, the playbook will **ask for approval** before removing permissions:

1. **How it works:**
   - Playbook detects unused permissions
   - Creates a finding in Security Command Center
   - Waits for human approval
   - Removes permission only after approval

2. **When to use:**
   - ✅ Initial setup and testing
   - ✅ Production environments with critical permissions
   - ✅ When you want full control over changes

3. **Configuration:**
   - No changes needed - this is the default setting
   - Approve findings in: Security Command Center > Findings

### Option B: Automatic Removal Mode (Advanced)

⚠️ **WARNING:** This will automatically remove permissions without human approval!

1. **How it works:**
   - Playbook detects unused permissions
   - Immediately removes them
   - Logs the action to BigQuery
   - No human approval required

2. **When to use:**
   - ⚠️ Only after thorough testing in Manual mode
   - ⚠️ For non-critical service accounts
   - ⚠️ With proper monitoring and alerting configured

3. **Configuration:**
   ```
   1. Open the playbook in SCC
   2. Find the building block: "IAM Setup Block_1"
   3. Click to edit the block
   4. Change: remediation_mode = "Manual" → "Automatic"
   5. Save the block
   6. Save the playbook
   ```

**Best Practice:** Start with Manual mode, review recommendations for 2-4 weeks, then enable Automatic mode only if confident.

---

## 📊 Monitoring & Alerts

### View Permission Removals in BigQuery

```sql
-- See all permission removals in the last 7 days
SELECT 
  timestamp,
  principal,
  permission,
  resource,
  days_unused,
  applied_automatically
FROM `PROJECT_ID.iam_audit_analytics.permission_removals`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC;
```

### View IAM Change Logs

```bash
# View recent IAM changes made by the playbook
gcloud logging read "
  protoPayload.serviceName='iam.googleapis.com'
  AND protoPayload.methodName='SetIamPolicy'
  AND protoPayload.authenticationInfo.principalEmail='iam-recommender-playbook@PROJECT_ID.iam.gserviceaccount.com'
" --limit=50 --format=json
```

### Subscribe to Pub/Sub Notifications

```bash
# Create a subscription to receive IAM change alerts
gcloud pubsub subscriptions create my-iam-alerts \
  --topic=iam-permission-changes \
  --push-endpoint=https://your-webhook-url.com/iam-alerts
```

### Set Up Cloud Monitoring Alerts

```bash
# Alert if more than 10 permissions removed in 1 hour
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="High IAM Permission Removal Rate" \
  --condition-display-name="More than 10 removals/hour" \
  --condition-threshold-value=10 \
  --condition-threshold-duration=3600s \
  --condition-filter='
    resource.type="bigquery_dataset"
    AND resource.labels.dataset_id="iam_audit_analytics"
    AND metric.type="bigquery.googleapis.com/storage/table/row_count"
  '
```

---

## 🧪 Testing

### Test 1: View Current Recommendations

```bash
# List IAM recommendations for your project
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --location=global \
  --recommender=google.iam.policy.Recommender
```

### Test 2: Create a Test Service Account with Excess Permissions

```bash
# Create test service account
gcloud iam service-accounts create test-overprivileged \
  --display-name="Test Service Account"

# Grant excessive permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:test-overprivileged@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Wait 90 days (or use recommender insights API to simulate)
# The IAM Recommender will flag this for removal
```

### Test 3: Verify Playbook Execution

1. **Trigger a playbook run manually:**
   - Go to: Security Command Center > Playbooks
   - Select: IAM Recommender Response
   - Click: **Run** (top right)

2. **Check the execution log:**
   - View results in the playbook run history
   - Verify findings were created

3. **Review in BigQuery:**
   ```sql
   SELECT COUNT(*) as removal_count
   FROM `PROJECT_ID.iam_audit_analytics.permission_removals`
   WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);
   ```

---

## 🔒 Security Best Practices

### 1. Review Recommendations Weekly

```bash
# Generate weekly report of recommendations
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --format="table(name, stateInfo.state, primaryImpact.category)"
```

### 2. Whitelist Critical Permissions

If certain permissions should never be removed:

1. Mark them as "CLAIMED" in IAM Recommender:
   ```bash
   gcloud recommender recommendations mark-claimed \
     RECOMMENDATION_ID \
     --project=PROJECT_ID \
     --location=global \
     --recommender=google.iam.policy.Recommender \
     --state-metadata="reason=business_critical"
   ```

### 3. Set Up Emergency Rollback

```bash
# Create a snapshot of current IAM policies (run daily)
gcloud projects get-iam-policy PROJECT_ID > iam-backup-$(date +%Y%m%d).json

# Restore from backup if needed
gcloud projects set-iam-policy PROJECT_ID iam-backup-YYYYMMDD.json
```

### 4. Implement Least-Privilege from the Start

```bash
# Instead of roles/editor, use specific roles:
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-service@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"  # Specific role, not broad access
```

---

## 📈 Expected Results

### After 1 Week:
- 5-15 recommendations generated
- Unused permissions identified
- Baseline established

### After 1 Month:
- 20-40% reduction in excessive permissions
- Service accounts right-sized
- Improved security posture

### After 3 Months:
- Minimal new recommendations (permissions optimized)
- Automated cleanup running smoothly
- HIPAA audit-ready access controls

---

## 🆘 Troubleshooting

### Issue: Playbook is not finding any recommendations

**Solution:**
```bash
# Verify IAM Recommender is enabled
gcloud services enable recommender.googleapis.com

# Check if recommendations exist
gcloud recommender recommendations list \
  --project=PROJECT_ID \
  --location=global \
  --recommender=google.iam.policy.Recommender
```

### Issue: Service account lacks permissions

**Error:** `Permission denied on resource`

**Solution:**
```bash
# Grant missing organization-level permissions
gcloud organizations add-iam-policy-binding ORG_ID \
  --member="serviceAccount:iam-recommender-playbook@PROJECT_ID.iam.gserviceaccount.com" \
  --role="organizations/ORG_ID/roles/iamRecommenderAutomation"
```

### Issue: Workload Identity authentication fails

**Error:** `Workload Identity federation failed`

**Solution:**
1. Verify Workload Identity Pool exists:
   ```bash
   gcloud iam workload-identity-pools describe scc-playbooks-pool \
     --location=global \
     --project=PROJECT_ID
   ```

2. Check service account impersonation:
   ```bash
   gcloud iam service-accounts get-iam-policy \
     iam-recommender-playbook@PROJECT_ID.iam.gserviceaccount.com
   ```

### Issue: Permissions were removed but shouldn't have been

**Solution:**
1. **Restore from backup:**
   ```bash
   gcloud projects set-iam-policy PROJECT_ID iam-backup-YYYYMMDD.json
   ```

2. **Mark recommendation as claimed:**
   ```bash
   gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
     --project=PROJECT_ID \
     --location=global \
     --recommender=google.iam.policy.Recommender
   ```

3. **Switch to Manual mode** until root cause is identified

---

## 📚 Additional Resources

- [IAM Recommender Documentation](https://cloud.google.com/iam/docs/recommender-overview)
- [Security Command Center Playbooks](https://cloud.google.com/security-command-center/docs/playbooks)
- [HIPAA Compliance on GCP](https://cloud.google.com/security/compliance/hipaa)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)

---

## ✅ Checklist

Before going to production:

- [ ] Terraform infrastructure deployed
- [ ] IAM Recommender playbook enabled in SCC
- [ ] Workload Identity configured
- [ ] Organization-level permissions granted
- [ ] BigQuery audit dataset accessible
- [ ] Pub/Sub notifications configured
- [ ] Cloud Monitoring alerts created
- [ ] Tested in Manual mode for 2+ weeks
- [ ] Weekly review process established
- [ ] Emergency rollback procedure documented
- [ ] Team trained on approval workflow

---

**Last Updated:** November 1, 2025  
**Status:** ✅ Ready for Deployment  
**Next Review:** January 1, 2026
