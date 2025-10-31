# Storage Infrastructure
# Cloud Storage buckets for audio files, EDI files, and backups

# KMS Key Ring and Keys for encryption
resource "google_kms_key_ring" "revclear" {
  name     = "revclear-keyring-${var.environment}"
  location = var.region
  
  depends_on = [google_project_service.required_apis]
}

resource "google_kms_crypto_key" "audio_encryption" {
  name            = "audio-encryption-key"
  key_ring        = google_kms_key_ring.revclear.id
  rotation_period = "7776000s" # 90 days
  
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key" "database_encryption" {
  name            = "database-encryption-key"
  key_ring        = google_kms_key_ring.revclear.id
  rotation_period = "7776000s"
  
  lifecycle {
    prevent_destroy = true
  }
}

# Audio Files Storage (HIPAA-compliant)
resource "google_storage_bucket" "audio_files" {
  name          = "${var.project_id}-audio-${var.environment}"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.audio_encryption.id
  }
  
  lifecycle_rule {
    condition {
      age = 2555 # 7 years (HIPAA retention requirement)
    }
    action {
      type = "Delete"
    }
  }
  
  logging {
    log_bucket = google_storage_bucket.logs.name
  }
}

# EDI Files Storage
resource "google_storage_bucket" "edi_files" {
  name          = "${var.project_id}-edi-${var.environment}"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.audio_encryption.id
  }
  
  lifecycle_rule {
    condition {
      age = 2555
    }
    action {
      type = "Delete"
    }
  }
}

# Logs Storage
resource "google_storage_bucket" "logs" {
  name          = "${var.project_id}-logs-${var.environment}"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 2555 # 7 years
    }
    action {
      type = "Delete"
    }
  }
}

# Terraform State Bucket (create manually before running terraform)
# gsutil mb -p PROJECT_ID -l us-central1 gs://revclear-terraform-state
# gsutil versioning set on gs://revclear-terraform-state

# Outputs
output "audio_bucket_name" {
  value = google_storage_bucket.audio_files.name
}

output "edi_bucket_name" {
  value = google_storage_bucket.edi_files.name
}

output "kms_key_ring" {
  value = google_kms_key_ring.revclear.id
}
