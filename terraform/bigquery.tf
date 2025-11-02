# BigQuery Infrastructure
# Data warehouse for analytics and ML training

resource "google_bigquery_dataset" "claims_analytics" {
  dataset_id    = "claims_analytics_${var.environment}"
  friendly_name = "RevClear Claims Analytics"
  description   = "Claims processing data for analytics and ML training"
  location      = "US"

  default_table_expiration_ms = 7889400000000 # 7 years in milliseconds

  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.audio_encryption.id
  }

  access {
    role          = "OWNER"
    user_by_email = data.google_project.project.number
  }

  depends_on = [google_project_service.required_apis]
}

# Claims Table
resource "google_bigquery_table" "processed_claims" {
  dataset_id = google_bigquery_dataset.claims_analytics.dataset_id
  table_id   = "processed_claims"

  time_partitioning {
    type  = "DAY"
    field = "submission_date"
  }

  clustering = ["status", "specialty", "payer_id"]

  schema = jsonencode([
    {
      name = "claim_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "submission_date"
      type = "TIMESTAMP"
      mode = "REQUIRED"
    },
    {
      name = "specialty"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "icd10_code"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "cpt_code"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "payer_id"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "status"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "ai_confidence_score"
      type = "FLOAT"
      mode = "NULLABLE"
    },
    {
      name = "processing_time_seconds"
      type = "INTEGER"
      mode = "NULLABLE"
    },
    {
      name = "hitl_gates_passed"
      type = "INTEGER"
      mode = "NULLABLE"
    },
    {
      name = "denial_reason"
      type = "STRING"
      mode = "NULLABLE"
    }
  ])
}

# Audit Logs Table
resource "google_bigquery_table" "audit_logs" {
  dataset_id = google_bigquery_dataset.claims_analytics.dataset_id
  table_id   = "audit_logs"

  time_partitioning {
    type  = "DAY"
    field = "event_timestamp"
  }

  schema = jsonencode([
    {
      name = "event_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "event_timestamp"
      type = "TIMESTAMP"
      mode = "REQUIRED"
    },
    {
      name = "user_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "action"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "resource_type"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "resource_id"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "ip_address"
      type = "STRING"
      mode = "NULLABLE"
    }
  ])
}

# ML Dataset for training
resource "google_bigquery_dataset" "ml_models" {
  dataset_id    = "ml_models_${var.environment}"
  friendly_name = "ML Models and Training Data"
  description   = "BigQuery ML models for claim prediction"
  location      = "US"

  depends_on = [google_project_service.required_apis]
}

# Outputs
output "bigquery_dataset_id" {
  value = google_bigquery_dataset.claims_analytics.dataset_id
}

output "ml_dataset_id" {
  value = google_bigquery_dataset.ml_models.dataset_id
}
