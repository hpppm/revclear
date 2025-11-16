variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "Name of the main S3 bucket"
  type        = string
}

variable "transcription_jobs_table_arn" {
  description = "ARN of the transcription jobs DynamoDB table"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "lambda_code_path" {
  description = "Path to Lambda function code"
  type        = string
  default     = "../backend/lambdas"
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
