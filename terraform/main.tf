# RevClear Healthcare Claims Management Platform
# Terraform Infrastructure as Code
# AWS Provider

# Networking Module
module "networking" {
  source = "./modules/networking"

  project_name             = var.project_name
  environment              = var.environment
  vpc_cidr                 = var.vpc_cidr
  availability_zones       = var.availability_zones
  public_subnet_cidrs      = var.public_subnet_cidrs
  private_subnet_cidrs     = var.private_subnet_cidrs
  database_subnet_cidrs    = var.database_subnet_cidrs
  additional_tags          = var.additional_tags
}

# Security Module
module "security" {
  source = "./modules/security"

  project_name                 = var.project_name
  environment                  = var.environment
  vpc_id                       = module.networking.vpc_id
  public_subnet_ids            = module.networking.public_subnet_ids
  private_subnet_ids           = module.networking.private_subnet_ids
  allowed_cidr_blocks          = var.allowed_cidr_blocks
  enable_waf                   = var.enable_waf
  enable_shield                = var.enable_shield
  cognito_user_pool_name       = var.cognito_user_pool_name
  cognito_mfa_configuration    = var.cognito_mfa_configuration
  cloudwatch_log_retention_days = var.cloudwatch_log_retention_days
  enable_cloudtrail            = var.enable_cloudtrail
  additional_tags              = var.additional_tags
}

# Storage Module
module "storage" {
  source = "./modules/storage"

  project_name                = var.project_name
  environment                 = var.environment
  kms_key_id                  = module.security.kms_key_id
  s3_bucket_prefix            = var.s3_bucket_prefix
  s3_versioning_enabled       = var.s3_versioning_enabled
  s3_lifecycle_glacier_days   = var.s3_lifecycle_glacier_days
  cloudtrail_bucket_name      = module.security.cloudtrail_bucket_name
  additional_tags             = var.additional_tags
}

# Database Module
module "database" {
  source = "./modules/database"

  project_name                = var.project_name
  environment                 = var.environment
  vpc_id                      = module.networking.vpc_id
  database_subnet_ids         = module.networking.database_subnet_ids
  db_security_group_id        = module.security.rds_security_group_id
  db_instance_class           = var.db_instance_class
  db_name                     = var.db_name
  db_username                 = var.db_username
  db_allocated_storage        = var.db_allocated_storage
  db_backup_retention_period  = var.db_backup_retention_period
  db_multi_az                 = var.db_multi_az
  kms_key_id                  = module.security.kms_key_id
  additional_tags             = var.additional_tags
}

# Compute Module (ECS Fargate + ALB)
module "compute" {
  source = "./modules/compute"

  project_name                  = var.project_name
  environment                   = var.environment
  vpc_id                        = module.networking.vpc_id
  public_subnet_ids             = module.networking.public_subnet_ids
  private_subnet_ids            = module.networking.private_subnet_ids
  alb_security_group_id         = module.security.alb_security_group_id
  ecs_security_group_id         = module.security.ecs_security_group_id
  fargate_cpu                   = var.fargate_cpu
  fargate_memory                = var.fargate_memory
  app_count                     = var.app_count
  container_image               = var.container_image
  ssl_certificate_arn           = var.ssl_certificate_arn
  cloudwatch_log_retention_days = var.cloudwatch_log_retention_days
  db_secret_arn                 = module.database.db_secret_arn
  s3_audio_bucket_arn           = module.storage.audio_bucket_arn
  s3_documents_bucket_arn       = module.storage.documents_bucket_arn
  cognito_user_pool_id          = module.security.cognito_user_pool_id
  additional_tags               = var.additional_tags
}

# AI Services Module
module "ai_services" {
  source = "./modules/ai-services"

  project_name                = var.project_name
  environment                 = var.environment
  s3_audio_bucket_arn         = module.storage.audio_bucket_arn
  s3_documents_bucket_arn     = module.storage.documents_bucket_arn
  transcribe_language_code    = var.transcribe_language_code
  bedrock_model_id            = var.bedrock_model_id
  cloudwatch_log_group_arn    = module.compute.cloudwatch_log_group_arn
  additional_tags             = var.additional_tags
}
