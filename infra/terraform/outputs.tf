output "ec2_public_ip" {
  description = "EC2 パブリック IP"
  value       = aws_instance.main.public_ip
}

output "ssh_command" {
  description = "SSH 接続コマンド"
  value       = "ssh -i ${local_sensitive_file.private_key.filename} ec2-user@${aws_instance.main.public_ip}"
}

output "app_url" {
  description = "アプリ URL"
  value       = "http://${aws_instance.main.public_ip}"
}

output "rds_endpoint" {
  description = "RDS エンドポイント（ポート除く）"
  value       = aws_db_instance.main.address
}
