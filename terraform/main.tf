# RevClear - Simple Terraform Configuration
# Only manages what's actually deployed

# Storage Module (S3 + DynamoDB)
module "storage" {
  source = "./modules/storage"

  project_name                = var.project_name
  environment                 = var.environment
  s3_bucket_prefix            = var.s3_bucket_prefix
  s3_versioning_enabled       = var.s3_versioning_enabled
  s3_lifecycle_glacier_days   = var.s3_lifecycle_glacier_days
  additional_tags             = var.additional_tags
}

# AI Services Module (Lambda + IAM)
module "ai_services" {
  source = "./modules/ai_services"

  project_name                 = var.project_name
  environment                  = var.environment
  region                       = var.region
  s3_bucket_name              = module.storage.main_bucket_id
  transcription_jobs_table_arn = module.storage.transcription_jobs_table_arn
  cognito_user_pool_id        = var.cognito_user_pool_id
  lambda_code_path            = var.lambda_code_path
  additional_tags             = var.additional_tags
}

# Note: Cognito, API Gateway, CloudTrail were created manually and are not managed by Terraform
