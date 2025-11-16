resource "aws_sagemaker_notebook_instance" "revclear_dev_notebook" {
  name          = "revclear-dev-notebook"
  instance_type = "ml.t3.medium"
  role_arn      = "arn:aws:iam::414669980881:role/SageMakerRole"
}
