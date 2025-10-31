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

# Log Sink for Long-term Storage (7 years HIPAA requirement)
resource "google_logging_project_sink" "audit_log_sink" {
  name        = "hipaa-audit-logs-${var.environment}"
  destination = "storage.googleapis.com/${google_storage_bucket.audit_logs.name}"
  
  filter = <<-EOT
    logName:"cloudaudit.googleapis.com" OR
    logName:"data_access" OR
    logName:"activity"
  EOT
  
  unique_writer_identity = true
}

# Audit Logs Storage Bucket (7-year retention)
resource "google_storage_bucket" "audit_logs" {
  name          = "${var.project_id}-audit-logs-${var.environment}"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.audit_encryption.id
  }
  
  lifecycle_rule {
    condition {
      age = 2555  # 7 years in days (HIPAA requirement)
    }
    action {
      type = "Delete"
    }
  }
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
  
  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
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

# Outputs
output "audit_log_bucket" {
  description = "Bucket for HIPAA audit logs (7-year retention)"
  value       = google_storage_bucket.audit_logs.name
}

output "audit_log_sink_writer" {
  description = "Service account for audit log writer"
  value       = google_logging_project_sink.audit_log_sink.writer_identity
}

output "hipaa_compliance_status" {
  description = "HIPAA compliance configuration status"
  value = {
    audit_logging_enabled        = true
    encryption_at_rest_enabled  = true
    encryption_in_transit_enabled = true
    log_retention_years         = 7
    key_rotation_days           = 90
    dlp_scanning_enabled        = true
    security_monitoring_enabled = var.enable_security_command_center
  }
}
