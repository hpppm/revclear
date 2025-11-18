# Run: terraform init -backend-config="bucket=${S3_TERRAFORM_STATE_BUCKET}"
terraform {
  backend "s3" {
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "revclear-terraform-locks"
    encrypt        = true
  }
}
