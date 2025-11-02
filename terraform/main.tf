# RevClear AI Medical System - Google Cloud Infrastructure
# Terraform Configuration for Production Deployment

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Store state in GCS bucket (create this manually first)
  backend "gcs" {
    bucket = "revclear-terraform-state"
    prefix = "terraform/state"
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "domain_name" {
  description = "Custom domain for the application"
  type        = string
  default     = "revclear.health"
}

# Provider Configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable Required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "run.googleapis.com",
    "speech.googleapis.com",
    "aiplatform.googleapis.com",
    "healthcare.googleapis.com",
    "documentai.googleapis.com", # NEW: Document AI for OCR and data extraction
    "dlp.googleapis.com",        # NEW: Data Loss Prevention (DLP)
    "sql-component.googleapis.com",
    "sqladmin.googleapis.com",
    "storage-api.googleapis.com",
    "cloudkms.googleapis.com",
    "secretmanager.googleapis.com",
    "pubsub.googleapis.com",
    "bigquery.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudscheduler.googleapis.com",
    "firebase.googleapis.com",
    "identitytoolkit.googleapis.com",
    "iap.googleapis.com",       # NEW: Identity-Aware Proxy
    "cloudarmor.googleapis.com" # NEW: Cloud Armor WAF
  ])

  service            = each.key
  disable_on_destroy = false
}

# Data Sources
data "google_project" "project" {
  project_id = var.project_id
}

# Outputs
output "project_number" {
  value = data.google_project.project.number
}

output "deployment_region" {
  value = var.region
}

output "environment" {
  value = var.environment
}
