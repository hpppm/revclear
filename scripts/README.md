# RevClear Deployment and Management Scripts

This directory contains automated scripts for deploying, monitoring, and managing RevClear on Google Cloud Platform with HIPAA compliance.

## 📋 Available Scripts

### 1. Security Scan (`security-scan.sh`)
**Purpose:** Validates HIPAA compliance and security controls in deployed infrastructure.

**Usage:**
```bash
PROJECT_ID=your-project-id ./scripts/security-scan.sh
```

**What it checks:**
- ✅ Business Associate Agreement (BAA) status
- ✅ Encryption at rest (Cloud KMS)
- ✅ Encryption in transit (TLS/SSL)
- ✅ Audit logging configuration
- ✅ Access controls and IAM policies
- ✅ Network security (VPC, firewalls)
- ✅ Key management and rotation
- ✅ Backup configuration
- ✅ Data Loss Prevention (DLP)
- ✅ Organization policies
- ✅ Secret management

**Exit codes:**
- `0` = All checks passed
- `1` = Critical security issues found

**Example output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RevClear HIPAA Security Scan - Project: revclear-prod
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ PASS: Cloud SQL 'medical-db-prod' uses CMEK encryption
✓ PASS: Bucket 'revclear-prod-audio' uses KMS encryption
✗ FAIL: Cloud SQL 'test-db' - SSL not required
```

---

### 2. Infrastructure Validation (`validate-infrastructure.sh`)
**Purpose:** Comprehensive testing of deployed infrastructure.

**Usage:**
```bash
PROJECT_ID=your-project-id REGION=us-central1 ./scripts/validate-infrastructure.sh
```

**Test suites:**
1. ✅ Required APIs enablement
2. ✅ Cloud Run services deployment
3. ✅ Cloud SQL database configuration
4. ✅ Cloud Storage buckets
5. ✅ Cloud KMS encryption keys
6. ✅ Audit logging setup
7. ✅ IAM and access controls
8. ✅ Network security
9. ✅ Secret management
10. ✅ Monitoring and alerting
11. ✅ Data Loss Prevention (DLP)
12. ✅ End-to-end integration

**Exit codes:**
- `0` = All tests passed (100% success)
- `1` = Some tests failed (>75% success)
- `1` = Multiple tests failed (<75% success)

---

### 3. Cost Monitoring Setup (`cost-monitoring-setup.sh`)
**Purpose:** Configures budget alerts and cost tracking.

**Usage:**
```bash
PROJECT_ID=your-project-id ./scripts/cost-monitoring-setup.sh
```

**Features:**
- 💰 Creates monthly budget with customizable amount
- 📧 Sets up email notifications for budget alerts
- 📊 Configures cost monitoring dashboard
- 🔔 Creates alert policies for high daily costs
- 📄 Generates cost optimization report

**Budget thresholds:**
- 50% - Early warning
- 75% - Approaching limit
- 90% - Critical threshold
- 100% - Budget exceeded

**Environment defaults:**
- `dev`: $200/month
- `staging`: $500/month
- `prod`: $1000/month

**Output files:**
- `cost-optimization-report.md` - Detailed cost analysis and recommendations

---

## 🚀 Deployment Workflow

### Initial Deployment

1. **Pre-deployment checks:**
   ```bash
   # Ensure BAA is signed
   # Verify prerequisites installed
   ```

2. **Run main deployment script:**
   ```bash
   ./deploy-gcp-hipaa.sh
   ```
   This script will:
   - Verify prerequisites (gcloud, terraform, git)
   - Confirm HIPAA BAA is signed
   - Configure GCP project and billing
   - Enable required APIs
   - Deploy infrastructure with Terraform
   - Set up monitoring and alerting

3. **Validate deployment:**
   ```bash
   PROJECT_ID=your-project-id ./scripts/validate-infrastructure.sh
   ```

4. **Run security scan:**
   ```bash
   PROJECT_ID=your-project-id ./scripts/security-scan.sh
   ```

5. **Set up cost monitoring:**
   ```bash
   PROJECT_ID=your-project-id ./scripts/cost-monitoring-setup.sh
   ```

### Continuous Operations

**Weekly:**
```bash
# Run security scan
PROJECT_ID=your-project-id ./scripts/security-scan.sh
```

**Monthly:**
```bash
# Validate infrastructure
PROJECT_ID=your-project-id ./scripts/validate-infrastructure.sh

# Review cost optimization report
cat cost-optimization-report.md
```

**Quarterly:**
```bash
# Full compliance audit
PROJECT_ID=your-project-id ./scripts/security-scan.sh > security-audit-$(date +%Y%m%d).log
PROJECT_ID=your-project-id ./scripts/validate-infrastructure.sh > infrastructure-audit-$(date +%Y%m%d).log
```

---

## 🔐 Security Best Practices

### Before Running Scripts

1. **Authentication:**
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Permissions required:**
   - `roles/owner` or `roles/editor` for full deployment
   - `roles/viewer` for read-only validation
   - Billing admin for cost monitoring setup

3. **Environment variables:**
   ```bash
   export PROJECT_ID=your-project-id
   export REGION=us-central1
   export ENVIRONMENT=prod
   ```

### Running in CI/CD

See `.github/workflows/deploy-gcp.yml` for automated deployment:
- Runs security scan before deployment
- Validates infrastructure after deployment
- Stores artifacts for audit trail

---

## 📊 Monitoring and Alerts

### Cost Monitoring

**Budget alerts sent when:**
- 50% of monthly budget used
- 75% of monthly budget used
- 90% of monthly budget used
- 100% of monthly budget used (critical)

**View costs:**
```bash
gcloud billing accounts list
# Then visit: https://console.cloud.google.com/billing/
```

### Security Monitoring

**Review Security Command Center:**
```bash
gcloud scc findings list --organization=YOUR_ORG_ID
```

**Check audit logs:**
```bash
gcloud logging read "logName:cloudaudit.googleapis.com" --limit=100
```

---

## 🆘 Troubleshooting

### Script fails with "Permission denied"

**Solution:**
```bash
chmod +x scripts/*.sh
```

### "gcloud: command not found"

**Solution:**
Install Google Cloud SDK:
```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# Windows
# Download from: https://cloud.google.com/sdk/docs/install
```

### Terraform state locked

**Solution:**
```bash
cd terraform
terraform force-unlock LOCK_ID
```

### Budget creation fails

**Cause:** Requires billing admin permissions

**Solution:**
```bash
# Grant billing admin role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/billing.admin"
```

### Security scan shows failures

**Action:** Review failed checks and address:
1. Check HIPAA_COMPLIANCE.md for requirements
2. Update terraform configuration
3. Run `terraform apply`
4. Re-run security scan

---

## 📖 Additional Documentation

- **Main deployment guide:** [DEPLOYMENT.md](../DEPLOYMENT.md)
- **HIPAA compliance:** [HIPAA_COMPLIANCE.md](../HIPAA_COMPLIANCE.md)
- **Pilot deployment:** [PILOT_DEPLOYMENT_GUIDE.md](../PILOT_DEPLOYMENT_GUIDE.md)
- **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Security policies:** [HIPAA_SECURITY_POLICIES.md](../HIPAA_SECURITY_POLICIES.md)

---

## 🤝 Support

**Issues?**
1. Check script output for specific errors
2. Review GCP Console for resource status
3. Consult documentation above
4. Open GitHub issue with error logs

**Security concerns?**
- Email: security@revclear.com
- Review: [HIPAA_COMPLIANCE.md](../HIPAA_COMPLIANCE.md)

---

## 📝 Script Maintenance

### Adding new checks to security-scan.sh

1. Add new test function
2. Update counters (PASS_COUNT/FAIL_COUNT)
3. Update summary section
4. Document in this README

### Adding new validation tests

1. Add new test suite to validate-infrastructure.sh
2. Follow existing pattern (test_pass/test_fail)
3. Update documentation

### Updating cost thresholds

1. Edit `cost-monitoring-setup.sh`
2. Update MONTHLY_BUDGET defaults
3. Adjust ALERT_THRESHOLD_* values

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-02 | Initial release with all core scripts |

---

**Status:** ✅ Production Ready  
**HIPAA Compliant:** ✅ Yes (with proper configuration)  
**Last Updated:** November 2, 2025
