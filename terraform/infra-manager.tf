# Infrastructure Manager with Cloud Build Automation
# This module automates deployment when you make pull requests or merge to main

module "im-workspace" {
  source  = "terraform-google-modules/bootstrap/google//modules/im_cloudbuild_workspace"
  version = "~> 7.0"

  project_id             = var.project_id
  deployment_id          = "revclear-${var.environment}"
  im_deployment_repo_uri = "https://github.com/hpppm/revclear"
  im_deployment_ref      = "main"  # Deploy from main branch

  # GitHub App Installation
  # Get this from: https://github.com/settings/installations
  github_app_installation_id = var.github_app_installation_id
  
  # GitHub Personal Access Token
  # Create at: https://github.com/settings/tokens
  # Permissions needed: repo, read:user (and read:org if in organization)
  github_personal_access_token = var.github_personal_access_token
  
  # Optional: Customize triggers
  trigger_identity_pool_id       = null
  trigger_identity_provider_id   = null
  infra_manager_sa_roles         = []
}

# Variables for GitHub integration
variable "github_app_installation_id" {
  description = "GitHub App Installation ID for Cloud Build"
  type        = string
  default     = ""  # Set this after installing Cloud Build GitHub App
}

variable "github_personal_access_token" {
  description = "GitHub Personal Access Token (will be stored in Secret Manager)"
  type        = string
  sensitive   = true
  default     = ""  # Set this from your GitHub account
}

# Outputs
output "cloudbuild_trigger_preview_id" {
  description = "Cloud Build trigger for PR previews"
  value       = try(module.im-workspace.cloudbuild_trigger_preview_id, null)
}

output "cloudbuild_trigger_apply_id" {
  description = "Cloud Build trigger for main branch deployments"
  value       = try(module.im-workspace.cloudbuild_trigger_apply_id, null)
}

output "github_secret_id" {
  description = "Secret Manager secret ID for GitHub token"
  value       = try(module.im-workspace.github_secret_id, null)
  sensitive   = true
}
