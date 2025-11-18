resource "aws_sagemaker_notebook_instance" "revclear_dev_notebook" {
  count         = var.create_sagemaker_notebook ? 1 : 0
  name          = "revclear-dev-notebook"
  instance_type = var.sagemaker_notebook_instance_type
  role_arn      = var.sagemaker_role_arn
}
