# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.networking.vpc_cidr
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.networking.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = module.networking.database_subnet_ids
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.compute.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.compute.alb_zone_id
}

# ECS/Fargate Outputs
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.ecs_cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.compute.ecs_service_name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.compute.ecr_repository_url
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.rds_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.database.rds_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.database.rds_database_name
}

# Storage Outputs
output "s3_audio_bucket_name" {
  description = "Name of S3 bucket for audio files"
  value       = module.storage.audio_bucket_name
}

output "s3_documents_bucket_name" {
  description = "Name of S3 bucket for documents"
  value       = module.storage.documents_bucket_name
}

output "s3_claims_bucket_name" {
  description = "Name of S3 bucket for claims/EDI files"
  value       = module.storage.claims_bucket_name
}

# Security Outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = module.security.kms_key_id
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = module.security.waf_web_acl_id
}

output "security_group_alb_id" {
  description = "ID of ALB security group"
  value       = module.security.alb_security_group_id
}

output "security_group_ecs_id" {
  description = "ID of ECS security group"
  value       = module.security.ecs_security_group_id
}

output "security_group_rds_id" {
  description = "ID of RDS security group"
  value       = module.security.rds_security_group_id
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = module.security.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = module.security.cognito_user_pool_client_id
  sensitive   = true
}

output "cognito_user_pool_domain" {
  description = "Domain of the Cognito User Pool"
  value       = module.security.cognito_user_pool_domain
}

# AI Services Outputs
output "transcribe_role_arn" {
  description = "ARN of IAM role for Transcribe"
  value       = module.ai_services.transcribe_role_arn
}

output "bedrock_role_arn" {
  description = "ARN of IAM role for Bedrock"
  value       = module.ai_services.bedrock_role_arn
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "Name of CloudWatch log group"
  value       = module.compute.cloudwatch_log_group_name
}

output "cloudtrail_bucket_name" {
  description = "Name of S3 bucket for CloudTrail logs"
  value       = module.security.cloudtrail_bucket_name
}

# Secrets Manager Outputs
output "db_secret_arn" {
  description = "ARN of database credentials secret"
  value       = module.database.db_secret_arn
  sensitive   = true
}

# General Outputs
output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}
