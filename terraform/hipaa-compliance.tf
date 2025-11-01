# HIPAA Compliance Configuration
# Security controls and configurations to meet HIPAA requirements on Google Cloud

# Enable required APIs for HIPAA compliance
resource "google_project_service" "hipaa_apis" {
  for_each = toset([
    "accessapproval.googleapis.com",
    "accesscontextmanager.googleapis.com",
    "cloudkms.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudaudit.googleapis.com",
    "securitycenter.googleapis.com",
    "dlp.googleapis.com"  # Sensitive Data Protection (DLP)
  ])
  
  service            = each.key
  disable_on_destroy = false
}

# Organization Policy Constraints for HIPAA
# These enforce security requirements at the project level

resource "google_project_organization_policy" "require_os_login" {
  project    = var.project_id
  constraint = "compute.requireOsLogin"
  
  boolean_policy {
    enforced = true
  }
}

resource "google_project_organization_policy" "disable_serial_port" {
  project    = var.project_id
  constraint = "compute.disableSerialPortAccess"
  
  boolean_policy {
    enforced = true
  }
}

resource "google_project_organization_policy" "require_shielded_vm" {
  project    = var.project_id
  constraint = "compute.requireShieldedVm"
  
  boolean_policy {
    enforced = true
  }
}

resource "google_project_organization_policy" "restrict_public_ip" {
  project    = var.project_id
  constraint = "compute.vmExternalIpAccess"
  
  list_policy {
    deny {
      all = true
    }
  }
}

# Audit Logging Configuration (HIPAA Required)
# All admin and data access must be logged

resource "google_project_iam_audit_config" "hipaa_audit_config" {
  project = var.project_id
  service = "allServices"
  
  audit_log_config {
    log_type = "ADMIN_READ"
  }
  
  audit_log_config {
    log_type = "DATA_READ"
  }
  
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# ==============================================================================
# Audit Logs (7-Year Retention for HIPAA Compliance)
# ==============================================================================
# HIPAA § 164.312(b) requires audit logs for ALL PHI access for 7 years
# This is separate from operational logs (90 days)

# Log Sink for HIPAA Audit Logs (PHI access events only)
resource "google_logging_project_sink" "hipaa_audit_logs" {
  name        = "hipaa-audit-logs-7yr-${var.environment}"
  destination = "storage.googleapis.com/${google_storage_bucket.hipaa_audit_logs.name}"
  
  # Only capture audit logs related to PHI access
  filter = <<-EOT
    protoPayload.serviceName="cloudaudit.googleapis.com" AND (
      protoPayload.methodName:"storage.objects" OR
      protoPayload.methodName:"cloudsql.instances" OR
      protoPayload.methodName:"bigquery.tables" OR
      protoPayload.methodName:"healthcare" OR
      resource.labels.service_name="run.googleapis.com"
    ) AND (
      protoPayload.authenticationInfo.principalEmail!="" OR
      protoPayload.authenticationInfo.serviceAccountEmail!=""
    )
  EOT
  
  unique_writer_identity = true
}

# HIPAA Audit Logs Storage Bucket (7-year retention)
resource "google_storage_bucket" "hipaa_audit_logs" {
  name          = "${var.project_id}-hipaa-audit-logs-${var.environment}"
  location      = var.region
  force_destroy = false  # Prevent accidental deletion
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true  # Protect against accidental overwrites
  }
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.audit_encryption.id
  }
  
  # Storage class transitions (cost optimization)
  lifecycle_rule {
    condition {
      age = 30  # After 30 days
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"  # $0.01/GB/month
    }
  }
  
  lifecycle_rule {
    condition {
      age = 365  # After 1 year
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"  # $0.004/GB/month
    }
  }
  
  lifecycle_rule {
    condition {
      age = 1825  # After 5 years
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"  # $0.0012/GB/month
    }
  }
  
  # HIPAA requirement: 7-year retention
  lifecycle_rule {
    condition {
      age = 2555  # 7 years in days
    }
    action {
      type = "Delete"
    }
  }

  # Additional protection: Retention policy prevents deletion before 7 years
  retention_policy {
    retention_period = 220752000  # 7 years in seconds (2555 days * 86400)
    is_locked        = var.lock_audit_retention  # Set to true in production
  }

  labels = {
    purpose      = "hipaa_audit_logs"
    retention    = "7_years"
    phi_category = "access_logs"
    compliance   = "hipaa"
  }
}

# Grant log writer access to HIPAA audit bucket
resource "google_storage_bucket_iam_member" "hipaa_audit_log_writer" {
  bucket = google_storage_bucket.hipaa_audit_logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.hipaa_audit_logs.writer_identity
}

# ==============================================================================
# Operational Logs (90-Day Retention)
# ==============================================================================
# Application logs, error logs, performance metrics (non-PHI)

# Log Sink for Operational Logs
resource "google_logging_project_sink" "operational_logs" {
  name        = "operational-logs-90d-${var.environment}"
  destination = "storage.googleapis.com/${google_storage_bucket.operational_logs.name}"
  
  # Application logs, errors, performance (exclude audit logs)
  filter = <<-EOT
    (
      resource.type="cloud_run_revision" OR
      resource.type="cloud_sql_database" OR
      resource.type="bigquery_resource"
    ) AND NOT (
      protoPayload.serviceName="cloudaudit.googleapis.com"
    )
  EOT
  
  unique_writer_identity = true
}

# Operational Logs Storage Bucket (90-day retention)
resource "google_storage_bucket" "operational_logs" {
  name          = "${var.project_id}-operational-logs-${var.environment}"
  location      = var.region
  force_destroy = true  # Can be deleted safely
  
  uniform_bucket_level_access = true
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.audit_encryption.id
  }
  
  # Keep in STANDARD storage (frequently accessed)
  lifecycle_rule {
    condition {
      age = 90  # Delete after 90 days
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    purpose      = "operational_logs"
    retention    = "90_days"
    phi_category = "none"
  }
}

# Grant log writer access to operational logs bucket
resource "google_storage_bucket_iam_member" "operational_log_writer" {
  bucket = google_storage_bucket.operational_logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.operational_logs.writer_identity
}

# Grant log writer access to audit bucket
resource "google_storage_bucket_iam_member" "audit_log_writer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.audit_log_sink.writer_identity
}

# Encryption Key for Audit Logs
resource "google_kms_crypto_key" "audit_encryption" {
  name            = "audit-log-encryption-key"
  key_ring        = google_kms_key_ring.revclear.id
  rotation_period = "7776000s"  # 90 days
  
  lifecycle {
    prevent_destroy = true
  }
}

# VPC Service Controls (HIPAA Best Practice)
# Creates a security perimeter around sensitive resources

resource "google_access_context_manager_access_policy" "hipaa_policy" {
  parent = "organizations/${data.google_project.project.org_id}"
  title  = "revclear-hipaa-policy-${var.environment}"
  
  count = var.enable_vpc_service_controls ? 1 : 0
}

# Security Command Center Notification
resource "google_scc_notification_config" "hipaa_security_notifications" {
  config_id    = "hipaa-security-alerts-${var.environment}"
  organization = data.google_project.project.org_id
  description  = "HIPAA security alerts for potential breaches"
  pubsub_topic = google_pubsub_topic.security_alerts.id
  
  streaming_config {
    filter = "severity=\"HIGH\" OR severity=\"CRITICAL\""
  }
  
  count = var.enable_security_command_center ? 1 : 0
}

# Pub/Sub Topic for Security Alerts
resource "google_pubsub_topic" "security_alerts" {
  name = "security-alerts-${var.environment}"
  
  message_retention_duration = "604800s"  # 7 days
}

# Sensitive Data Protection (DLP) Job Trigger
# Scans for PHI in Cloud Storage
resource "google_data_loss_prevention_job_trigger" "phi_detection" {
  parent = "projects/${var.project_id}"
  
  triggers {
    schedule {
      recurrence_period_duration = "86400s"  # Daily
    }
  }
  
  inspect_job {
    storage_config {
      cloud_storage_options {
        file_set {
          url = "gs://${google_storage_bucket.audio_files.name}/*"
        }
      }
    }
    
    inspect_config {
      info_types {
        name = "PERSON_NAME"
      }
      info_types {
        name = "PHONE_NUMBER"
      }
      info_types {
        name = "EMAIL_ADDRESS"
      }
      info_types {
        name = "US_SOCIAL_SECURITY_NUMBER"
      }
      info_types {
        name = "DATE_OF_BIRTH"
      }
      info_types {
        name = "MEDICAL_RECORD_NUMBER"
      }
      
      min_likelihood = "POSSIBLE"
      
      rule_set {
        info_types {
          name = "PERSON_NAME"
        }
        rules {
          hotword_rule {
            hotword_regex {
              pattern = "patient"
            }
            proximity {
              window_before = 50
            }
            likelihood_adjustment {
              fixed_likelihood = "VERY_LIKELY"
            }
          }
        }
      }
    }
    
    actions {
      pub_sub {
        topic = google_pubsub_topic.dlp_findings.id
      }
    }
  }
}

# Pub/Sub Topic for DLP Findings
resource "google_pubsub_topic" "dlp_findings" {
  name = "dlp-findings-${var.environment}"
}

# Variables for HIPAA features
variable "enable_vpc_service_controls" {
  description = "Enable VPC Service Controls (requires organization-level permissions)"
  type        = bool
  default     = false
}

variable "enable_security_command_center" {
  description = "Enable Security Command Center notifications (requires organization-level permissions)"
  type        = bool
  default     = false
}

variable "lock_audit_retention" {
  description = "Lock 7-year retention policy (cannot be unlocked once set). Set to true in production."
  type        = bool
  default     = false
}

# Outputs
output "hipaa_audit_log_bucket" {
  description = "Bucket for HIPAA audit logs (7-year retention)"
  value       = google_storage_bucket.hipaa_audit_logs.name
}

output "operational_log_bucket" {
  description = "Bucket for operational logs (90-day retention)"
  value       = google_storage_bucket.operational_logs.name
}

output "hipaa_audit_log_sink_writer" {
  description = "Service account for HIPAA audit log writer"
  value       = google_logging_project_sink.hipaa_audit_logs.writer_identity
}

output "operational_log_sink_writer" {
  description = "Service account for operational log writer"
  value       = google_logging_project_sink.operational_logs.writer_identity
}

output "hipaa_compliance_status" {
  description = "HIPAA compliance configuration status"
  value = {
    audit_logging_enabled         = true
    hipaa_audit_retention_years   = 7
    operational_log_retention_days = 90
    encryption_at_rest_enabled    = true
    encryption_in_transit_enabled = true
    key_rotation_days             = 90
    dlp_scanning_enabled          = true
    security_monitoring_enabled   = var.enable_security_command_center
    retention_policy_locked       = var.lock_audit_retention
  }
}
