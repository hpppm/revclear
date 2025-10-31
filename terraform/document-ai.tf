# =============================================================================
# Document AI Configuration
# =============================================================================
# Purpose: AI-powered document processing for medical billing documents
# - Process invoices, EOBs, claims, and patient records
# - OCR for scanned documents
# - Structured data extraction (CPT codes, ICD-10, patient IDs, dates)
# - HIPAA compliant
# =============================================================================

# Enable Document AI API
resource "google_project_service" "documentai" {
  project = var.project_id
  service = "documentai.googleapis.com"

  disable_on_destroy = false
}

# Document AI Processor for Medical Documents
# This processor is trained to extract structured data from healthcare documents
resource "google_document_ai_processor" "medical_claims_processor" {
  project      = var.project_id
  location     = "us" # Document AI is only available in "us" or "eu"
  display_name = "RevClear Medical Claims Processor"
  type         = "FORM_PARSER_PROCESSOR" # General form parser - can be customized

  depends_on = [google_project_service.documentai]
}

# Document AI Processor for EOB (Explanation of Benefits)
resource "google_document_ai_processor" "eob_processor" {
  project      = var.project_id
  location     = "us"
  display_name = "RevClear EOB Processor"
  type         = "FORM_PARSER_PROCESSOR"

  depends_on = [google_project_service.documentai]
}

# Document AI Processor for Invoices
resource "google_document_ai_processor" "invoice_processor" {
  project      = var.project_id
  location     = "us"
  display_name = "RevClear Invoice Processor"
  type         = "INVOICE_PROCESSOR" # Specialized for invoices

  depends_on = [google_project_service.documentai]
}

# =============================================================================
# Cloud Storage Bucket for Document Processing
# =============================================================================

# Bucket for incoming raw documents (pre-processing)
resource "google_storage_bucket" "documents_inbox" {
  name     = "${var.project_id}-documents-inbox-${var.environment}"
  location = var.region
  project  = var.project_id

  # Encryption
  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  # Lifecycle - move old documents to cheaper storage
  lifecycle_rule {
    condition {
      age = 90 # 90 days
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365 # 1 year
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # HIPAA: 7-year retention for billing records
  lifecycle_rule {
    condition {
      age = 2555 # 7 years
    }
    action {
      type = "Delete"
    }
  }

  # Uniform bucket-level access
  uniform_bucket_level_access {
    enabled = true
  }

  # Versioning for audit trail
  versioning {
    enabled = true
  }

  labels = {
    environment = var.environment
    team        = "billing"
    compliance  = "hipaa"
    purpose     = "document-ingestion"
  }
}

# Bucket for processed documents (post-Document AI)
resource "google_storage_bucket" "documents_processed" {
  name     = "${var.project_id}-documents-processed-${var.environment}"
  location = var.region
  project  = var.project_id

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 2555 # 7 years
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access {
    enabled = true
  }

  versioning {
    enabled = true
  }

  labels = {
    environment = var.environment
    team        = "billing"
    compliance  = "hipaa"
    purpose     = "processed-documents"
  }
}

# =============================================================================
# Pub/Sub Topics for Document Processing Pipeline
# =============================================================================

# Topic: New document uploaded (triggers Document AI processing)
resource "google_pubsub_topic" "document_uploaded" {
  name    = "document-uploaded-${var.environment}"
  project = var.project_id

  labels = {
    environment = var.environment
    purpose     = "document-ingestion"
  }
}

# Topic: Document AI processing complete
resource "google_pubsub_topic" "document_processed" {
  name    = "document-processed-${var.environment}"
  project = var.project_id

  labels = {
    environment = var.environment
    purpose     = "document-processing"
  }
}

# Topic: Document AI extraction failed
resource "google_pubsub_topic" "document_failed" {
  name    = "document-failed-${var.environment}"
  project = var.project_id

  labels = {
    environment = var.environment
    purpose     = "error-handling"
  }
}

# =============================================================================
# Cloud Storage Notifications (Trigger Pub/Sub on Upload)
# =============================================================================

# Notification: When document uploaded to inbox → trigger Pub/Sub
resource "google_storage_notification" "document_upload_trigger" {
  bucket         = google_storage_bucket.documents_inbox.name
  payload_format = "JSON_API_V1"
  topic          = google_pubsub_topic.document_uploaded.id

  event_types = [
    "OBJECT_FINALIZE" # Trigger when file upload completes
  ]

  # Only trigger for specific file types
  object_name_prefix = "" # Process all files

  depends_on = [google_pubsub_topic_iam_binding.gcs_publisher]
}

# IAM: Allow Cloud Storage to publish to Pub/Sub
data "google_storage_project_service_account" "gcs_account" {
  project = var.project_id
}

resource "google_pubsub_topic_iam_binding" "gcs_publisher" {
  topic   = google_pubsub_topic.document_uploaded.id
  role    = "roles/pubsub.publisher"
  members = [
    "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
  ]
}

# =============================================================================
# IAM Permissions for Document AI
# =============================================================================

# Service account for Document AI processing
resource "google_service_account" "document_ai_processor" {
  account_id   = "document-ai-processor-${var.environment}"
  display_name = "Document AI Processor Service Account"
  description  = "Service account for processing medical documents with Document AI"
  project      = var.project_id
}

# Permission: Read from inbox bucket
resource "google_storage_bucket_iam_member" "documentai_inbox_reader" {
  bucket = google_storage_bucket.documents_inbox.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.document_ai_processor.email}"
}

# Permission: Write to processed bucket
resource "google_storage_bucket_iam_member" "documentai_processed_writer" {
  bucket = google_storage_bucket.documents_processed.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.document_ai_processor.email}"
}

# Permission: Use Document AI processors
resource "google_project_iam_member" "documentai_user" {
  project = var.project_id
  role    = "roles/documentai.apiUser"
  member  = "serviceAccount:${google_service_account.document_ai_processor.email}"
}

# Permission: Publish to Pub/Sub topics
resource "google_pubsub_topic_iam_member" "documentai_publisher_processed" {
  project = var.project_id
  topic   = google_pubsub_topic.document_processed.id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.document_ai_processor.email}"
}

resource "google_pubsub_topic_iam_member" "documentai_publisher_failed" {
  project = var.project_id
  topic   = google_pubsub_topic.document_failed.id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.document_ai_processor.email}"
}

# =============================================================================
# BigQuery Dataset for Document AI Results
# =============================================================================

# Dataset: Store extracted data from documents
resource "google_bigquery_dataset" "document_extractions" {
  dataset_id  = "document_extractions_${var.environment}"
  project     = var.project_id
  location    = var.region
  description = "Extracted data from Document AI processing"

  # HIPAA: Encryption
  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.bigquery_key.id
  }

  # HIPAA: Prevent accidental deletion
  delete_contents_on_destroy = false

  labels = {
    environment = var.environment
    compliance  = "hipaa"
    purpose     = "document-ai-results"
  }
}

# Table: Document metadata and extraction results
resource "google_bigquery_table" "document_extractions_table" {
  dataset_id          = google_bigquery_dataset.document_extractions.dataset_id
  table_id            = "extractions"
  project             = var.project_id
  deletion_protection = true # HIPAA: Prevent accidental deletion

  schema = jsonencode([
    {
      name        = "document_id"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "Unique document identifier"
    },
    {
      name        = "document_type"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "Type: claim, eob, invoice, medical_record"
    },
    {
      name        = "upload_timestamp"
      type        = "TIMESTAMP"
      mode        = "REQUIRED"
      description = "When document was uploaded"
    },
    {
      name        = "processing_timestamp"
      type        = "TIMESTAMP"
      mode        = "NULLABLE"
      description = "When Document AI processing completed"
    },
    {
      name        = "processor_id"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "Document AI processor ID used"
    },
    {
      name        = "patient_id"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "Extracted patient identifier"
    },
    {
      name        = "procedure_codes"
      type        = "STRING"
      mode        = "REPEATED"
      description = "Extracted CPT codes"
    },
    {
      name        = "diagnosis_codes"
      type        = "STRING"
      mode        = "REPEATED"
      description = "Extracted ICD-10 codes"
    },
    {
      name        = "service_date"
      type        = "DATE"
      mode        = "NULLABLE"
      description = "Date of service"
    },
    {
      name        = "billed_amount"
      type        = "NUMERIC"
      mode        = "NULLABLE"
      description = "Total billed amount"
    },
    {
      name        = "insurance_provider"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "Insurance company name"
    },
    {
      name        = "extracted_fields"
      type        = "JSON"
      mode        = "NULLABLE"
      description = "All extracted fields as JSON"
    },
    {
      name        = "confidence_scores"
      type        = "JSON"
      mode        = "NULLABLE"
      description = "Confidence scores for extracted fields"
    },
    {
      name        = "human_reviewed"
      type        = "BOOLEAN"
      mode        = "NULLABLE"
      description = "Whether a human reviewed this extraction"
    },
    {
      name        = "review_timestamp"
      type        = "TIMESTAMP"
      mode        = "NULLABLE"
      description = "When human review completed"
    },
    {
      name        = "status"
      type        = "STRING"
      mode        = "REQUIRED"
      description = "Status: pending, processed, reviewed, failed"
    },
    {
      name        = "error_message"
      type        = "STRING"
      mode        = "NULLABLE"
      description = "Error message if processing failed"
    }
  ])

  # HIPAA: 7-year retention
  time_partitioning {
    type          = "DAY"
    field         = "upload_timestamp"
    expiration_ms = 220752000000 # 7 years in milliseconds
  }

  # Clustering for query performance
  clustering = ["document_type", "status", "patient_id"]
}

# =============================================================================
# Outputs
# =============================================================================

output "document_ai_processors" {
  description = "Document AI processor IDs"
  value = {
    medical_claims = google_document_ai_processor.medical_claims_processor.id
    eob            = google_document_ai_processor.eob_processor.id
    invoice        = google_document_ai_processor.invoice_processor.id
  }
}

output "document_storage_buckets" {
  description = "Document storage bucket names"
  value = {
    inbox     = google_storage_bucket.documents_inbox.name
    processed = google_storage_bucket.documents_processed.name
  }
}

output "document_pubsub_topics" {
  description = "Document processing Pub/Sub topics"
  value = {
    uploaded  = google_pubsub_topic.document_uploaded.name
    processed = google_pubsub_topic.document_processed.name
    failed    = google_pubsub_topic.document_failed.name
  }
}

output "document_ai_service_account" {
  description = "Document AI processor service account email"
  value       = google_service_account.document_ai_processor.email
}

output "document_bigquery_dataset" {
  description = "BigQuery dataset for Document AI extractions"
  value       = google_bigquery_dataset.document_extractions.dataset_id
}
