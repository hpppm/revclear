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

resource "aws_s3_bucket" "revclear_ai_data" {
  bucket = "revclear-ai-data-414669980881"
}

resource "aws_s3_bucket" "revclear_terraform_state" {
  bucket = "revclear-terraform-state-414669980881"
}
