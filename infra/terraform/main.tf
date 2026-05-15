terraform {
  required_version = ">= 1.6, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0, < 6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = ">= 4.0, < 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = ">= 2.0, < 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
