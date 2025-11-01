# ==============================================================================
# VPC Service Controls for HIPAA Compliance
# ==============================================================================
# Purpose: Implement VPC Service Controls (VPCSC) to create security perimeters
#          around GCP resources containing PHI, preventing data exfiltration
#
# HIPAA Requirement: § 164.312(a)(1) - Access Control
#                    § 164.312(e)(1) - Transmission Security
#
# Resources Protected:
# - Cloud Storage (audio files, ERA files)
# - Cloud SQL (patient data, claims)
# - BigQuery (analytics, ML training data)
# - Secret Manager (API keys, DB passwords)
#
# Security Benefits:
# - Prevents accidental data exfiltration via copy operations
# - Blocks external IP access to protected resources
# - Requires VPN/Private Google Access for admin access
# - Enforces identity-based access within perimeter
# ==============================================================================

# Access Context Manager API (required for VPC-SC)
resource "google_project_service" "access_context_manager" {
  project = var.project_id
  service = "accesscontextmanager.googleapis.com"

  disable_on_destroy = false
}

# ==============================================================================
# 1. Access Policy (Organization-Level)
# ==============================================================================
# Note: If your organization already has an Access Policy, use data source instead:
# data "google_access_context_manager_access_policy" "existing" {
#   parent = "organizations/${var.organization_id}"
# }

resource "google_access_context_manager_access_policy" "revclear_policy" {
  count  = var.create_new_access_policy ? 1 : 0
  parent = "organizations/${var.organization_id}"
  title  = "RevClear HIPAA VPC-SC Policy"

  depends_on = [google_project_service.access_context_manager]
}

locals {
  access_policy_name = var.create_new_access_policy ? google_access_context_manager_access_policy.revclear_policy[0].name : var.existing_access_policy_name
}

# ==============================================================================
# 2. Access Levels (Define WHO can access the perimeter)
# ==============================================================================

# Access Level 1: Corporate Network Access
resource "google_access_context_manager_access_level" "corporate_network" {
  parent = "accessPolicies/${local.access_policy_name}"
  name   = "accessPolicies/${local.access_policy_name}/accessLevels/corporate_network"
  title  = "Corporate Network Access"

  basic {
    # Allow access from corporate IP ranges
    conditions {
      ip_subnetworks = var.corporate_ip_ranges  # e.g., ["203.0.113.0/24"]
    }
  }
}

# Access Level 2: Authorized Devices (requires BeyondCorp)
resource "google_access_context_manager_access_level" "authorized_devices" {
  parent = "accessPolicies/${local.access_policy_name}"
  name   = "accessPolicies/${local.access_policy_name}/accessLevels/authorized_devices"
  title  = "BeyondCorp Authorized Devices"

  basic {
    conditions {
      # Require device to be managed by organization
      device_policy {
        require_screen_lock              = true
        require_admin_approval           = true
        require_corp_owned               = true
        allowed_encryption_statuses      = ["ENCRYPTED"]
        allowed_device_management_levels = ["COMPLETE"]
      }
    }
  }
}

# Access Level 3: US-Only Access (for HIPAA compliance)
resource "google_access_context_manager_access_level" "us_only" {
  parent = "accessPolicies/${local.access_policy_name}"
  name   = "accessPolicies/${local.access_policy_name}/accessLevels/us_only"
  title  = "United States Only"

  basic {
    conditions {
      # Restrict to US regions only
      regions = ["US"]
    }
  }
}

# Combine access levels (ALL must be true)
resource "google_access_context_manager_access_level" "revclear_combined" {
  parent = "accessPolicies/${local.access_policy_name}"
  name   = "accessPolicies/${local.access_policy_name}/accessLevels/revclear_combined_access"
  title  = "RevClear Combined Access Requirements"

  basic {
    combining_function = "AND"  # All conditions must be met

    conditions {
      # Corporate network OR authorized device
      members = [
        "user:admin@revclear.com",
        "serviceAccount:${google_service_account.backend_service.email}"
      ]
    }

    conditions {
      # US-only access
      regions = ["US"]
    }
  }
}

# ==============================================================================
# 3. Service Perimeter (Define WHAT resources are protected)
# ==============================================================================

resource "google_access_context_manager_service_perimeter" "revclear_phi_perimeter" {
  parent = "accessPolicies/${local.access_policy_name}"
  name   = "accessPolicies/${local.access_policy_name}/servicePerimeters/revclear_phi_perimeter"
  title  = "RevClear PHI Data Perimeter"

  # Perimeter type: REGULAR (enforced) or BRIDGE (connects two perimeters)
  perimeter_type = "PERIMETER_TYPE_REGULAR"

  # Projects within this perimeter
  status {
    resources = [
      "projects/${data.google_project.current.number}"
    ]

    # Services allowed within the perimeter
    restricted_services = [
      "storage.googleapis.com",        # Cloud Storage (audio, ERA files)
      "sqladmin.googleapis.com",       # Cloud SQL (patient data)
      "bigquery.googleapis.com",       # BigQuery (analytics)
      "secretmanager.googleapis.com",  # Secret Manager (credentials)
      "aiplatform.googleapis.com",     # Vertex AI (ML models)
      "logging.googleapis.com",        # Cloud Logging (audit logs)
    ]

    # Access levels required to breach the perimeter
    access_levels = [
      google_access_context_manager_access_level.revclear_combined.name
    ]

    # VPC accessible services (services that can be called FROM inside perimeter)
    vpc_accessible_services {
      enable_restriction = true

      # Allow these services to be accessed from VPC
      allowed_services = [
        "storage.googleapis.com",
        "sqladmin.googleapis.com",
        "bigquery.googleapis.com",
        "secretmanager.googleapis.com",
        "aiplatform.googleapis.com",
        "logging.googleapis.com",
        "monitoring.googleapis.com",
        "cloudtrace.googleapis.com",
        "pubsub.googleapis.com",
        "run.googleapis.com"
      ]
    }

    # Ingress policies (traffic INTO the perimeter)
    ingress_policies {
      ingress_from {
        # Allow access from these sources
        sources {
          access_level = google_access_context_manager_access_level.revclear_combined.name
        }

        # Identity type allowed
        identity_type = "ANY_IDENTITY"
      }

      # Allow these operations
      ingress_to {
        resources = ["*"]  # All resources in perimeter

        operations {
          service_name = "storage.googleapis.com"
          method_selectors {
            method = "google.storage.objects.get"
          }
          method_selectors {
            method = "google.storage.objects.create"
          }
        }

        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors {
            method = "google.cloud.bigquery.v2.JobService.Query"
          }
        }
      }
    }

    # Egress policies (traffic OUT OF the perimeter)
    egress_policies {
      egress_from {
        identity_type = "ANY_SERVICE_ACCOUNT"

        # Allow egress from these identities
        identities = [
          "serviceAccount:${google_service_account.backend_service.email}",
          "serviceAccount:${google_service_account.retraining_function.email}"
        ]
      }

      # Allow egress to these external services
      egress_to {
        resources = ["*"]  # Allow calls to external APIs

        operations {
          service_name = "*"  # All services (for OpenAI API, clearinghouse, etc.)
        }
      }
    }
  }

  # Use explicit dry run spec for testing before enforcement
  use_explicit_dry_run_spec = var.vpc_sc_dry_run_mode
}

# ==============================================================================
# 4. Service Perimeter - Dry Run (for testing)
# ==============================================================================
# Before fully enforcing VPC-SC, test with dry run mode to identify issues

resource "google_access_context_manager_service_perimeter_dry_run_resource" "dry_run" {
  count = var.vpc_sc_dry_run_mode ? 1 : 0

  perimeter_name = google_access_context_manager_service_perimeter.revclear_phi_perimeter.name

  spec {
    resources = [
      "projects/${data.google_project.current.number}"
    ]

    restricted_services = [
      "storage.googleapis.com",
      "sqladmin.googleapis.com",
      "bigquery.googleapis.com"
    ]

    # More permissive access levels for testing
    access_levels = [
      google_access_context_manager_access_level.us_only.name
    ]
  }
}

# ==============================================================================
# 5. Monitoring & Alerts
# ==============================================================================

# Alert when VPC-SC blocks a request (potential security breach attempt)
resource "google_logging_metric" "vpcsc_violation" {
  name   = "vpcsc_violation_attempts"
  filter = "protoPayload.status.code=\"7\" AND protoPayload.status.message=~\".*VPC Service Controls.*\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"

    labels {
      key         = "service_name"
      value_type  = "STRING"
      description = "Service that was blocked"
    }
  }

  label_extractors = {
    "service_name" = "EXTRACT(protoPayload.serviceName)"
  }
}

resource "google_monitoring_alert_policy" "vpcsc_violations" {
  display_name = "VPC Service Controls Violation Detected"
  combiner     = "OR"

  conditions {
    display_name = "VPC-SC blocked a request"

    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/vpcsc_violation_attempts\" resource.type=\"global\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.security_team.id
  ]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content = <<-EOT
    # VPC Service Controls Violation

    A request was blocked by VPC Service Controls. This may indicate:
    1. Legitimate access from unexpected location (add to access level)
    2. Misconfigured service account permissions
    3. **Security incident: data exfiltration attempt**

    ## Immediate Actions:
    1. Check Cloud Logging for blocked request details
    2. Identify source IP and identity
    3. Verify if request was legitimate
    4. If suspicious, escalate to security team immediately

    ## Query:
    ```
    protoPayload.status.code="7" AND 
    protoPayload.status.message=~".*VPC Service Controls.*"
    ```
    EOT
  }
}

resource "google_monitoring_notification_channel" "security_team" {
  display_name = "Security Team PagerDuty"
  type         = "pagerduty"

  labels = {
    service_key = var.pagerduty_security_key
  }
}

# ==============================================================================
# 6. Outputs
# ==============================================================================

output "service_perimeter_name" {
  description = "Name of the VPC Service Controls perimeter"
  value       = google_access_context_manager_service_perimeter.revclear_phi_perimeter.name
}

output "access_policy_name" {
  description = "Name of the Access Context Manager policy"
  value       = local.access_policy_name
}

output "protected_services" {
  description = "List of services protected by VPC-SC"
  value = [
    "storage.googleapis.com",
    "sqladmin.googleapis.com",
    "bigquery.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "logging.googleapis.com"
  ]
}

output "dry_run_mode" {
  description = "Whether VPC-SC is in dry run mode (testing only)"
  value       = var.vpc_sc_dry_run_mode
}

# ==============================================================================
# Variables (add to variables.tf)
# ==============================================================================

variable "organization_id" {
  description = "GCP Organization ID (e.g., 123456789012)"
  type        = string
}

variable "create_new_access_policy" {
  description = "Create new Access Policy or use existing (org can only have one)"
  type        = bool
  default     = true
}

variable "existing_access_policy_name" {
  description = "Name of existing Access Policy (if create_new_access_policy = false)"
  type        = string
  default     = ""
}

variable "corporate_ip_ranges" {
  description = "List of corporate IP ranges allowed to access perimeter (CIDR notation)"
  type        = list(string)
  default     = []  # Add your office IPs: ["203.0.113.0/24"]
}

variable "vpc_sc_dry_run_mode" {
  description = "Run VPC-SC in dry run mode (logs violations but doesn't block)"
  type        = bool
  default     = true  # Start with true, set to false after testing
}

variable "pagerduty_security_key" {
  description = "PagerDuty integration key for security alerts"
  type        = string
  sensitive   = true
}
