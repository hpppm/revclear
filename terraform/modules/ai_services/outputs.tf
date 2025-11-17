output "transcribe_audio_lambda_arn" {
  description = "ARN of the transcribe audio Lambda function"
  value       = aws_lambda_function.transcribe_audio.arn
}

output "transcribe_audio_lambda_name" {
  description = "Name of the transcribe audio Lambda function"
  value       = aws_lambda_function.transcribe_audio.function_name
}

output "process_audio_lambda_arn" {
  description = "ARN of the process audio Lambda function"
  value       = aws_lambda_function.process_audio.arn
}

output "process_audio_lambda_name" {
  description = "Name of the process audio Lambda function"
  value       = aws_lambda_function.process_audio.function_name
}

output "bedrock_lambda_arn" {
  description = "ARN of the Bedrock processing Lambda function"
  value       = aws_lambda_function.process_with_bedrock.arn
}

output "bedrock_lambda_name" {
  description = "Name of the Bedrock processing Lambda function"
  value       = aws_lambda_function.process_with_bedrock.function_name
}

output "ai_lambda_role_arn" {
  description = "ARN of the AI Lambda IAM role"
  value       = aws_iam_role.ai_lambda_role.arn
}

output "s3_invoke_permission_id" {
  description = "ID of the S3 invoke permission for dependency management"
  value       = aws_lambda_permission.allow_s3_invoke.id
}

output "whisper_lambda_arn" {
  description = "ARN of the Whisper transcription Lambda function"
  value       = aws_lambda_function.whisper_transcribe.arn
}

output "whisper_lambda_name" {
  description = "Name of the Whisper transcription Lambda function"
  value       = aws_lambda_function.whisper_transcribe.function_name
}
