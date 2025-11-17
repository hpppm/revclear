resource "aws_iam_role" "ai_lambda_role" {
  name = "${var.project_name}-${var.environment}-ai-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ai_lambda_policy" {
  name = "${var.project_name}-${var.environment}-ai-lambda-policy"
  role = aws_iam_role.ai_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartMedicalTranscriptionJob",
          "transcribe:GetMedicalTranscriptionJob",
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          var.transcription_jobs_table_arn,
          "${var.transcription_jobs_table_arn}/*"
        ]
      }
    ]
  })
}

# Lambda function for API-triggered transcription
resource "aws_lambda_function" "transcribe_audio" {
  function_name = "${var.project_name}-${var.environment}-transcribe-audio"
  role          = aws_iam_role.ai_lambda_role.arn
  handler       = "transcribeAudio.handler"
  runtime       = "nodejs18.x"
  filename      = "${var.lambda_code_path}/transcribeAudio.zip"
  timeout       = 60
  memory_size   = 512

  environment {
    variables = {
      AWS_REGION              = var.region
      COGNITO_USER_POOL_ID   = var.cognito_user_pool_id
      S3_BUCKET_MAIN         = var.s3_bucket_name
      DYNAMODB_TABLE_PREFIX  = "${var.project_name}-${var.environment}"
    }
  }

  tags = var.additional_tags
}

# Lambda function for S3-triggered transcription
resource "aws_lambda_function" "process_audio" {
  function_name = "${var.project_name}-${var.environment}-process-audio"
  role          = aws_iam_role.ai_lambda_role.arn
  handler       = "processAudioLambda.handler"
  runtime       = "nodejs18.x"
  filename      = "${var.lambda_code_path}/processAudioLambda.zip"
  timeout       = 60
  memory_size   = 512

  environment {
    variables = {
      AWS_REGION              = var.region
      S3_BUCKET_MAIN         = var.s3_bucket_name
      DYNAMODB_TABLE_PREFIX  = "${var.project_name}-${var.environment}"
    }
  }

  tags = var.additional_tags
}

# Lambda permission for S3 to invoke processAudioLambda
resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_audio.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::${var.s3_bucket_name}"
}

# Lambda function for Bedrock processing
resource "aws_lambda_function" "process_with_bedrock" {
  function_name = "${var.project_name}-${var.environment}-process-bedrock"
  role          = aws_iam_role.ai_lambda_role.arn
  handler       = "processWithBedrock.handler"
  runtime       = "nodejs18.x"
  filename      = "${var.lambda_code_path}/processWithBedrock.zip"
  timeout       = 90
  memory_size   = 1024

  environment {
    variables = {
      AWS_REGION            = var.region
      BEDROCK_MODEL_ID      = "anthropic.claude-3-sonnet-20240229-v1:0"
      S3_BUCKET_MAIN       = var.s3_bucket_name
    }
  }

  tags = var.additional_tags
}

# S3 event notification to trigger Lambda on audio file upload
resource "aws_s3_bucket_notification" "audio_upload" {
  bucket = var.s3_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.process_audio.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = ""
    filter_suffix       = ".wav"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.process_audio.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = ""
    filter_suffix       = ".mp3"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.process_audio.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = ""
    filter_suffix       = ".flac"
  }

  depends_on = [aws_lambda_permission.allow_s3_invoke]
}

# Lambda function for Whisper transcription
resource "aws_lambda_function" "whisper_transcribe" {
  function_name = "${var.project_name}-${var.environment}-whisper-transcribe"
  role          = aws_iam_role.ai_lambda_role.arn
  handler       = "lambda_handler.lambda_handler"
  runtime       = "python3.10"
  filename      = "${var.lambda_code_path}/whisper-lambda.zip"
  timeout       = 300  # 5 minutes for audio processing
  memory_size   = 4096  # 4GB for Whisper model
  
  ephemeral_storage {
    size = 2048  # 2GB for model and temp files
  }

  environment {
    variables = {
      WHISPER_MODEL_SIZE = "base"
      AWS_REGION         = var.region
      S3_BUCKET_MAIN     = var.s3_bucket_name
    }
  }

  tags = merge(
    var.additional_tags,
    {
      Service = "Whisper-Transcription"
    }
  )
}
