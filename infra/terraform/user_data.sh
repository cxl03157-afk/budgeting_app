#!/bin/bash
set -e

# システムパッケージ更新
dnf update -y

# Python 3.12（EC2 環境: Amazon Linux 2023 / dnf 安定版）
dnf install -y python3.12 python3.12-pip python3-devel gcc

# MySQL クライアント（RDS への init.sql 流し込みに使用）
# AL2023 では mysql パッケージは存在しないため mariadb105 を使用（互換あり）
dnf install -y mariadb105

# Git（リポジトリ取得用）
dnf install -y git

# Node.js 22 LTS（フロントエンドビルド用）
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

# Nginx
dnf install -y nginx
systemctl enable nginx
systemctl start nginx

# 起動確認用プレースホルダーページ
cat > /usr/share/nginx/html/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Budgeting App</title>
  <style>
    body { display: flex; justify-content: center; align-items: center;
           height: 100vh; margin: 0; font-family: sans-serif; background: #f5f5f5; }
    .box { text-align: center; background: white; padding: 40px;
           border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    h1 { color: #6366f1; }
  </style>
</head>
<body>
  <div class="box">
    <h1>EC2 is running!</h1>
    <p>Terraform によるデプロイに成功しました。</p>
    <p>次のステップ: アプリをデプロイしてください。</p>
  </div>
</body>
</html>
EOF
