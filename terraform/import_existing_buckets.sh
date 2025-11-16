#!/bin/bash
set -e

terraform init -reconfigure

terraform import aws_s3_bucket.arevclear arevclear
terraform import aws_s3_bucket.arevclear_exports arevclear-exports
terraform import aws_s3_bucket.arevclear_logs arevclear-logs
terraform import aws_s3_bucket.arevclear_raw arevclear-raw
terraform import aws_s3_bucket.revclear_ai_data revclear-ai-data-414669980881
terraform import aws_s3_bucket.revclear_terraform_state revclear-terraform-state-414669980881

terraform plan
