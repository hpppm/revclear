terraform {
  backend "s3" {
    bucket         = "revclear-terraform-state-414669980881"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "revclear-terraform-locks"
    encrypt        = true
  }
}
