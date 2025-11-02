# Pub/Sub Infrastructure
# Event-driven architecture for claim processing pipeline

# Topics
resource "google_pubsub_topic" "claims_submitted" {
  name = "claims-submitted-${var.environment}"

  message_retention_duration = "604800s" # 7 days

  depends_on = [google_project_service.required_apis]
}

resource "google_pubsub_topic" "claims_approved" {
  name = "claims-approved-${var.environment}"

  message_retention_duration = "604800s"
}

resource "google_pubsub_topic" "claims_denied" {
  name = "claims-denied-${var.environment}"

  message_retention_duration = "604800s"
}

resource "google_pubsub_topic" "transcription_complete" {
  name = "transcription-complete-${var.environment}"

  message_retention_duration = "604800s"
}

resource "google_pubsub_topic" "ai_analysis_complete" {
  name = "ai-analysis-complete-${var.environment}"

  message_retention_duration = "604800s"
}

# Subscriptions
resource "google_pubsub_subscription" "claims_submitted_sub" {
  name  = "claims-submitted-sub-${var.environment}"
  topic = google_pubsub_topic.claims_submitted.name

  ack_deadline_seconds = 300

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_subscription" "transcription_complete_sub" {
  name  = "transcription-complete-sub-${var.environment}"
  topic = google_pubsub_topic.transcription_complete.name

  ack_deadline_seconds = 300

  push_config {
    push_endpoint = "${google_cloud_run_service.api.status[0].url}/api/v1/webhooks/transcription"

    oidc_token {
      service_account_email = google_service_account.api_service_account.email
    }
  }
}

resource "google_pubsub_subscription" "ai_analysis_complete_sub" {
  name  = "ai-analysis-complete-sub-${var.environment}"
  topic = google_pubsub_topic.ai_analysis_complete.name

  ack_deadline_seconds = 300

  push_config {
    push_endpoint = "${google_cloud_run_service.api.status[0].url}/api/v1/webhooks/ai-analysis"

    oidc_token {
      service_account_email = google_service_account.api_service_account.email
    }
  }
}

# Dead Letter Topic
resource "google_pubsub_topic" "dead_letter" {
  name = "dead-letter-${var.environment}"

  message_retention_duration = "2592000s" # 30 days
}

resource "google_pubsub_subscription" "dead_letter_sub" {
  name  = "dead-letter-sub-${var.environment}"
  topic = google_pubsub_topic.dead_letter.name

  ack_deadline_seconds = 600
}

# Outputs
output "claims_submitted_topic" {
  value = google_pubsub_topic.claims_submitted.name
}

output "transcription_complete_topic" {
  value = google_pubsub_topic.transcription_complete.name
}
