variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "リソース命名に使用するプロジェクト名"
  type        = string
  default     = "budgeting-app"
}

variable "instance_type" {
  description = "EC2インスタンスタイプ（Free Tier: t2.micro）"
  type        = string
  default     = "t2.micro"
}

variable "my_ip" {
  description = "SSH・HTTP アクセスを許可する自分のIPアドレス（CIDR形式: x.x.x.x/32）"
  type        = string
}

variable "db_name" {
  description = "データベース名"
  type        = string
  default     = "budgeting"
}

variable "db_user" {
  description = "データベースユーザー名"
  type        = string
  default     = "app"
}

variable "db_password" {
  description = "データベースパスワード（terraform apply 実行時に入力）"
  type        = string
  sensitive   = true
}
