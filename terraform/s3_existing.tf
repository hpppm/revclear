resource "aws_s3_bucket" "arevclear" {
  bucket = "arevclear"
}

resource "aws_s3_bucket" "arevclear_exports" {
  bucket = "arevclear-exports"
}

resource "aws_s3_bucket" "arevclear_logs" {
  bucket = "arevclear-logs"
}

resource "aws_s3_bucket" "arevclear_raw" {
  bucket = "arevclear-raw"
}

# Import with: terraform import aws_s3_bucket.revclear_ai_data ${BUCKET_AI}
resource "aws_s3_bucket" "revclear_ai_data" {
  bucket = var.bucket_ai_data
}

# Import with: terraform import aws_s3_bucket.revclear_terraform_state ${BUCKET_TERRAFORM}
resource "aws_s3_bucket" "revclear_terraform_state" {
  bucket = var.bucket_terraform_state
}
