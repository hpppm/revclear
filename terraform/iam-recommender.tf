# ============================================================================
# IAM Recommender Automation for Security Hardening
# ============================================================================
# Automatically identifies and removes excess permissions to minimize
# attack surface and maintain least-privilege access for HIPAA compliance.
#
# Features:
# - Scans for unused permissions (90+ days)
# - Identifies over-permissioned service accounts
# - Detects unnecessary service account impersonations
# - Automatic remediation via Security Command Center playbooks
# ============================================================================

# Custom IAM Role for Recommender Automation
resource "google_organization_iam_custom_role" "iam_recommender_automation" {
  role_id     = "iamRecommenderAutomation"
  org_id      = var.organization_id
  title       = "IAM Recommender Automation Role"
  description = "Custom role for automated IAM permission cleanup via Security Command Center playbooks"

  permissions = [
    # Required for automated permission removal
    "resourcemanager.organizations.setIamPolicy",
    "resourcemanager.projects.setIamPolicy",

    # Read access to analyze recommendations
    "recommender.iamPolicyRecommendations.list",
    "recommender.iamPolicyRecommendations.get",
    "recommender.iamPolicyRecommendations.update",

    # Insight access for security analysis
    "recommender.iamPolicyInsights.list",
    "recommender.iamPolicyInsights.get",
    "recommender.iamPolicyInsights.update",

    # Logging for audit trail
    "logging.logEntries.create",
  ]

  stage = "GA"
}

# Service Account for IAM Recommender Playbook
resource "google_service_account" "iam_recommender_playbook" {
  account_id   = "iam-recommender-playbook"
  display_name = "IAM Recommender Playbook Service Account"
  description  = "Service account used by Security Command Center to automatically remove excess IAM permissions"
  project      = var.project_id
}

# Grant custom role to the service account at organization level
resource "google_organization_iam_member" "iam_recommender_automation" {
  org_id = var.organization_id
  role   = google_organization_iam_custom_role.iam_recommender_automation.id
  member = "serviceAccount:${google_service_account.iam_recommender_playbook.email}"
}

# Enable Security Command Center API (required for playbooks)
resource "google_project_service" "securitycenter" {
  project = var.project_id
  service = "securitycenter.googleapis.com"

  disable_on_destroy = false
}

# Enable Cloud Asset API (required for IAM analysis)
resource "google_project_service" "cloudasset" {
  project = var.project_id
  service = "cloudasset.googleapis.com"

  disable_on_destroy = false
}

# Enable Recommender API
resource "google_project_service" "recommender" {
  project = var.project_id
  service = "recommender.googleapis.com"

  disable_on_destroy = false
}

# IAM Policy Binding for Cloud Logging (audit trail)
resource "google_project_iam_member" "recommender_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.iam_recommender_playbook.email}"
}

# Grant read access to IAM recommendations at project level
resource "google_project_iam_member" "recommender_viewer" {
  project = var.project_id
  role    = "roles/recommender.iamViewer"
  member  = "serviceAccount:${google_service_account.iam_recommender_playbook.email}"
}

# Workload Identity Pool for Security Command Center integration
resource "google_iam_workload_identity_pool" "scc_playbooks" {
  workload_identity_pool_id = "scc-playbooks-pool"
  display_name              = "Security Command Center Playbooks Pool"
  description               = "Workload Identity Pool for SCC playbook automation"
  project                   = var.project_id

  depends_on = [google_project_service.securitycenter]
}

# Workload Identity Pool Provider
resource "google_iam_workload_identity_pool_provider" "scc_playbooks_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.scc_playbooks.workload_identity_pool_id
  workload_identity_pool_provider_id = "scc-playbooks-provider"
  display_name                       = "SCC Playbooks Provider"
  project                            = var.project_id

  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.aud"           = "assertion.aud"
    "attribute.principal_set" = "assertion.principal_set"
  }

  oidc {
    allowed_audiences = ["https://iam.googleapis.com/${google_iam_workload_identity_pool.scc_playbooks.name}"]
    issuer_uri        = "https://securitycenter.googleapis.com"
  }
}

# Allow Workload Identity to impersonate the service account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.iam_recommender_playbook.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.scc_playbooks.name}/*"
}

# ============================================================================
# Monitoring and Alerting for IAM Changes
# ============================================================================

# Log Sink for IAM permission removals
resource "google_logging_project_sink" "iam_permission_removals" {
  name        = "iam-permission-removals"
  destination = "logging.googleapis.com/projects/${var.project_id}/logs/iam-recommender-actions"

  # Filter for IAM policy changes made by the recommender
  filter = <<-EOT
    protoPayload.serviceName="iam.googleapis.com"
    AND protoPayload.methodName="SetIamPolicy"
    AND protoPayload.authenticationInfo.principalEmail="${google_service_account.iam_recommender_playbook.email}"
  EOT

  unique_writer_identity = true
}

# Pub/Sub topic for IAM change notifications
resource "google_pubsub_topic" "iam_changes" {
  name    = "iam-permission-changes"
  project = var.project_id

  labels = {
    purpose    = "security-monitoring"
    compliance = "hipaa"
    automation = "iam-recommender"
  }
}

# Pub/Sub subscription for monitoring
resource "google_pubsub_subscription" "iam_changes_monitoring" {
  name  = "iam-changes-monitoring-sub"
  topic = google_pubsub_topic.iam_changes.name

  # Keep messages for 7 days for audit review
  message_retention_duration = "604800s"

  # Acknowledge within 10 minutes
  ack_deadline_seconds = 600

  labels = {
    purpose    = "security-audit"
    compliance = "hipaa"
  }
}

# ============================================================================
# BigQuery Dataset for IAM Audit Analytics
# ============================================================================

resource "google_bigquery_dataset" "iam_audit" {
  dataset_id  = "iam_audit_analytics"
  project     = var.project_id
  location    = var.region
  description = "Analytics dataset for IAM permission changes and recommender actions"

  # 2-year retention for HIPAA audit requirements
  default_table_expiration_ms = 63072000000 # 2 years

  labels = {
    purpose    = "security-audit"
    compliance = "hipaa"
    pii        = "none"
  }

  access {
    role          = "OWNER"
    user_by_email = google_service_account.iam_recommender_playbook.email
  }
}

# Table for tracking permission removals
resource "google_bigquery_table" "permission_removals" {
  dataset_id = google_bigquery_dataset.iam_audit.dataset_id
  table_id   = "permission_removals"
  project    = var.project_id

  schema = jsonencode([
    {
      name        = "timestamp"
      type        = "TIMESTAMP"
      mode        = "REQUIRED"
      description = "When the permission was removed"
    },
    {
      name        = "principal"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "User or service account that lost permissions"
    },
    {
      name        = "permission"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "Permission that was removed"
    },
    {
      name        = "resource"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "Resource the permission was removed from"
    },
    {
      name        = "last_used"
      type        = "TIMESTAMP"
      mode        = "NULLABLE"
      description = "Last time the permission was used"
    },
    {
      name        = "days_unused"
      type        = "INTEGER"
      mode        = "NULLABLE"
      description = "Number of days the permission went unused"
    },
    {
      name        = "recommendation_id"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "IAM Recommender recommendation ID"
    },
    {
      name        = "applied_automatically"
      type        = "BOOLEAN"
      mode        = "REQUIRED"
      description = "Whether removal was automatic or manual"
    },
    {
      name        = "approved_by"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "User who approved the removal (if manual)"
    }
  ])

  labels = {
    purpose    = "security-audit"
    compliance = "hipaa"
  }
}

# ============================================================================
# Outputs
# ============================================================================

output "iam_recommender_service_account_email" {
  description = "Email of the service account used for IAM Recommender automation"
  value       = google_service_account.iam_recommender_playbook.email
}

output "workload_identity_pool" {
  description = "Workload Identity Pool for Security Command Center playbooks"
  value       = google_iam_workload_identity_pool.scc_playbooks.name
}

output "iam_audit_dataset" {
  description = "BigQuery dataset for IAM audit analytics"
  value       = google_bigquery_dataset.iam_audit.dataset_id
}

output "iam_changes_topic" {
  description = "Pub/Sub topic for IAM change notifications"
  value       = google_pubsub_topic.iam_changes.name
}

# ============================================================================
# MANUAL STEPS REQUIRED AFTER TERRAFORM APPLY:
# ============================================================================
# 
# 1. Enable IAM Recommender Response Playbook in Security Command Center:
#    - Go to: Security Command Center > Response > Playbooks
#    - Search for: "IAM Recommender Response"
#    - Click: Enable playbook
#    - Configure Workload Identity Email: Use the output value above
#
# 2. Configure Automatic Approval (Optional - Advanced):
#    - In playbook settings, find: "IAM Setup Block_1"
#    - Change remediation_mode: Manual → Automatic
#    - Save playbook
#    - WARNING: This will auto-remove permissions without approval
#
# 3. Set up Monitoring Dashboard:
#    - Create alerts for: Permission removal count > 10 per hour
#    - Monitor BigQuery table: iam_audit_analytics.permission_removals
#    - Set up email notifications via Pub/Sub subscription
#
# 4. Review Recommendations Weekly:
#    - Go to: IAM & Admin > Recommender
#    - Review suggestions before enabling automatic mode
#    - Verify no critical permissions are flagged for removal
#
# ============================================================================
