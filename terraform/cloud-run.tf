# Cloud Run Services
# Containerized backend API services

# Backend API Service
resource "google_cloud_run_service" "api" {
  name     = "revclear-api-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/revclear-api:latest"

        ports {
          container_port = 8080
        }

        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }

        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }

        env {
          name  = "DB_CONNECTION_NAME"
          value = google_sql_database_instance.revclear_db.connection_name
        }

        env {
          name  = "DB_USER"
          value = google_sql_user.app_user.name
        }

        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name  = "AUDIO_BUCKET"
          value = google_storage_bucket.audio_files.name
        }

        env {
          name  = "EDI_BUCKET"
          value = google_storage_bucket.edi_files.name
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
      }

      service_account_name = google_service_account.api_service_account.email

      timeout_seconds = 300
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"        = "100"
        "autoscaling.knative.dev/minScale"        = var.environment == "prod" ? "1" : "0"
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.connector.name
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "run.googleapis.com/cloudsql-instances"   = google_sql_database_instance.revclear_db.connection_name
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_service.required_apis,
    google_vpc_access_connector.connector
  ]
}

# Frontend Web App
resource "google_cloud_run_service" "frontend" {
  name     = "revclear-frontend-${var.environment}"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/revclear-frontend:latest"

        ports {
          container_port = 8080
        }

        env {
          name  = "API_URL"
          value = google_cloud_run_service.api.status[0].url
        }

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }

      service_account_name = google_service_account.frontend_service_account.email
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "50"
        "autoscaling.knative.dev/minScale" = var.environment == "prod" ? "2" : "0"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.required_apis]
}

# IAM - Allow public access to frontend
resource "google_cloud_run_service_iam_member" "frontend_public" {
  service  = google_cloud_run_service.frontend.name
  location = google_cloud_run_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# IAM - Allow authenticated access to API
resource "google_cloud_run_service_iam_member" "api_authenticated" {
  service  = google_cloud_run_service.api.name
  location = google_cloud_run_service.api.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.frontend_service_account.email}"
}

# Service Accounts
resource "google_service_account" "api_service_account" {
  account_id   = "revclear-api-${var.environment}"
  display_name = "RevClear API Service Account"
}

resource "google_service_account" "frontend_service_account" {
  account_id   = "revclear-frontend-${var.environment}"
  display_name = "RevClear Frontend Service Account"
}

# Outputs
output "api_url" {
  value = google_cloud_run_service.api.status[0].url
}

output "frontend_url" {
  value = google_cloud_run_service.frontend.status[0].url
}
