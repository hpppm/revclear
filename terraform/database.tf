# Database Infrastructure
# Cloud SQL PostgreSQL for claims data, users, and audit logs

resource "google_sql_database_instance" "revclear_db" {
  name             = "revclear-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  deletion_protection = true

  settings {
    tier              = var.environment == "prod" ? "db-custom-4-16384" : "db-custom-2-8192"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.revclear_vpc.id
      require_ssl     = true
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.required_apis
  ]
}

# Databases
resource "google_sql_database" "claims_db" {
  name     = "claims"
  instance = google_sql_database_instance.revclear_db.name
}

resource "google_sql_database" "audit_db" {
  name     = "audit"
  instance = google_sql_database_instance.revclear_db.name
}

# Database Users (passwords stored in Secret Manager)
resource "google_sql_user" "app_user" {
  name     = "revclear-app"
  instance = google_sql_database_instance.revclear_db.name
  type     = "BUILT_IN"
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "revclear-db-password-${var.environment}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# Outputs
output "database_connection_name" {
  value = google_sql_database_instance.revclear_db.connection_name
}

output "database_private_ip" {
  value     = google_sql_database_instance.revclear_db.private_ip_address
  sensitive = true
}
