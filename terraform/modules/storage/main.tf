# S3 Bucket for audio files, transcripts, and AI outputs
resource "aws_s3_bucket" "main" {
  bucket = "${var.project_name}-${var.environment}-main"
  
  tags = merge(
    var.additional_tags,
    {
      Name        = "${var.project_name}-${var.environment}-main"
      Environment = var.environment
      Purpose     = "Medical audio files and transcripts"
    }
  )
}

# Enable versioning for compliance
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle policy for old transcripts
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "archive-old-audio"
    status = "Enabled"

    filter {
      prefix = "*/audio/"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years for HIPAA compliance
    }
  }

  rule {
    id     = "clean-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 7
    }
  }
}

# CORS configuration for direct uploads
resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"]  # Restrict this to your domain in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# S3 bucket for CloudTrail logs (compliance)
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "${var.project_name}-${var.environment}-cloudtrail"
  
  tags = merge(
    var.additional_tags,
    {
      Name        = "${var.project_name}-${var.environment}-cloudtrail"
      Environment = var.environment
      Purpose     = "Audit logs"
    }
  )
}

# Block public access for CloudTrail bucket
resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudTrail bucket policy
resource "aws_s3_bucket_policy" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# DynamoDB table for transcription job tracking
resource "aws_dynamodb_table" "transcription_jobs" {
  name           = "${var.project_name}-${var.environment}-transcription-jobs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "jobName"
  
  attribute {
    name = "jobName"
    type = "S"
  }
  
  attribute {
    name = "tenant"
    type = "S"
  }
  
  attribute {
    name = "encounterID"
    type = "S"
  }
  
  attribute {
    name = "createdAt"
    type = "S"
  }

  # GSI for querying by tenant
  global_secondary_index {
    name            = "TenantIndex"
    hash_key        = "tenant"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for querying by encounter
  global_secondary_index {
    name            = "EncounterIndex"
    hash_key        = "encounterID"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = merge(
    var.additional_tags,
    {
      Name        = "${var.project_name}-${var.environment}-transcription-jobs"
      Environment = var.environment
    }
  )
}

# DynamoDB table for patients
resource "aws_dynamodb_table" "patients" {
  name           = "${var.project_name}-${var.environment}-patients"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "tenant"
  range_key      = "patientID"
  
  attribute {
    name = "tenant"
    type = "S"
  }
  
  attribute {
    name = "patientID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(
    var.additional_tags,
    {
      Name        = "${var.project_name}-${var.environment}-patients"
      Environment = var.environment
    }
  )
}

# DynamoDB table for encounters
resource "aws_dynamodb_table" "encounters" {
  name           = "${var.project_name}-${var.environment}-encounters"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "tenant"
  range_key      = "encounterID"
  
  attribute {
    name = "tenant"
    type = "S"
  }
  
  attribute {
    name = "encounterID"
    type = "S"
  }
  
  attribute {
    name = "patientID"
    type = "S"
  }

  global_secondary_index {
    name            = "PatientIndex"
    hash_key        = "patientID"
    range_key       = "encounterID"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(
    var.additional_tags,
    {
      Name        = "${var.project_name}-${var.environment}-encounters"
      Environment = var.environment
    }
  )
}
