#!/bin/bash
set -e

source ../.env

terraform init -backend-config="bucket=${BUCKET_TERRAFORM}"

terraform import aws_s3_bucket.arevclear ${S3_MAIN_BUCKET}
terraform import aws_s3_bucket.arevclear_exports ${S3_EXPORTS_BUCKET}
terraform import aws_s3_bucket.arevclear_logs ${S3_LOGS_BUCKET}
terraform import aws_s3_bucket.arevclear_raw ${S3_RAW_BUCKET}
terraform import aws_s3_bucket.revclear_ai_data ${BUCKET_AI}
terraform import aws_s3_bucket.revclear_terraform_state ${BUCKET_TERRAFORM}

terraform plan
