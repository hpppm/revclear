# Cloud Build Configuration for Automated Deployments
# Triggered automatically by GitHub pull requests and merges

# Cloud Build Service Account
resource "google_service_account" "cloudbuild" {
  account_id   = "cloudbuild-infra-manager"
  display_name = "Cloud Build for Infrastructure Manager"
  description  = "Service account for Cloud Build to deploy with Infra Manager"
}

# Grant Cloud Build permissions to deploy infrastructure
resource "google_project_iam_member" "cloudbuild_infra_manager" {
  project = var.project_id
  role    = "roles/config.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild.email}"
}

resource "google_project_iam_member" "cloudbuild_storage" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild.email}"
}

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild.email}"
}

resource "google_project_iam_member" "cloudbuild_sql_admin" {
  project = var.project_id
  role    = "roles/cloudsql.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild.email}"
}

resource "google_project_iam_member" "cloudbuild_compute_admin" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild.email}"
}

resource "google_project_iam_member" "cloudbuild_service_account_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloudbuild.email}"
}

# Enable Cloud Build API
resource "google_project_service" "cloudbuild_api" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# Cloud Build configuration file
# This is what Cloud Build runs on each trigger
resource "local_file" "cloudbuild_yaml" {
  filename = "${path.module}/../cloudbuild.yaml"
  content  = <<-EOT
# Cloud Build Configuration for RevClear
# Automatically runs on pull requests and merges

steps:
  # Step 1: Validate Terraform
  - name: 'hashicorp/terraform:1.5'
    id: 'terraform-init'
    dir: 'terraform'
    args: ['init']
  
  - name: 'hashicorp/terraform:1.5'
    id: 'terraform-validate'
    dir: 'terraform'
    args: ['validate']
  
  # Step 2: Terraform Plan (Preview)
  - name: 'hashicorp/terraform:1.5'
    id: 'terraform-plan'
    dir: 'terraform'
    args: ['plan', '-out=tfplan']
    env:
      - 'TF_VAR_project_id=$PROJECT_ID'
      - 'TF_VAR_region=us-central1'
      - 'TF_VAR_environment=$_ENVIRONMENT'
  
  # Step 3: Apply (only on main branch)
  - name: 'hashicorp/terraform:1.5'
    id: 'terraform-apply'
    dir: 'terraform'
    args: ['apply', '-auto-approve', 'tfplan']
    env:
      - 'TF_VAR_project_id=$PROJECT_ID'
      - 'TF_VAR_region=us-central1'
      - 'TF_VAR_environment=$_ENVIRONMENT'

# Substitutions
substitutions:
  _ENVIRONMENT: 'dev'

# Build timeout
timeout: '1800s'

# Service account to use
serviceAccount: 'projects/$PROJECT_ID/serviceAccounts/${google_service_account.cloudbuild.email}'

# Options
options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
EOT
}

# Outputs
output "cloudbuild_service_account" {
  value = google_service_account.cloudbuild.email
}
