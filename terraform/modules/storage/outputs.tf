output "main_bucket_id" {
  description = "ID of the main S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "main_bucket_arn" {
  description = "ARN of the main S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "cloudtrail_bucket_id" {
  description = "ID of the CloudTrail S3 bucket"
  value       = aws_s3_bucket.cloudtrail.id
}

output "cloudtrail_bucket_arn" {
  description = "ARN of the CloudTrail S3 bucket"
  value       = aws_s3_bucket.cloudtrail.arn
}

output "transcription_jobs_table_name" {
  description = "Name of the transcription jobs DynamoDB table"
  value       = aws_dynamodb_table.transcription_jobs.name
}

output "transcription_jobs_table_arn" {
  description = "ARN of the transcription jobs DynamoDB table"
  value       = aws_dynamodb_table.transcription_jobs.arn
}

output "patients_table_name" {
  description = "Name of the patients DynamoDB table"
  value       = aws_dynamodb_table.patients.name
}

output "patients_table_arn" {
  description = "ARN of the patients DynamoDB table"
  value       = aws_dynamodb_table.patients.arn
}

output "encounters_table_name" {
  description = "Name of the encounters DynamoDB table"
  value       = aws_dynamodb_table.encounters.name
}

output "encounters_table_arn" {
  description = "ARN of the encounters DynamoDB table"
  value       = aws_dynamodb_table.encounters.arn
}
