# インフラ構築手順書

## 構成概要

| リソース | 仕様 |
|---------|------|
| EC2 | t2.micro / Amazon Linux 2023 / ap-northeast-1a |
| RDS | db.t3.micro / MySQL 8.4 / gp2 20GB / プライベートサブネット |
| Nginx | EC2 上で稼働。Vue.js SPA を配信し `/api/` を FastAPI へプロキシ |
| FastAPI | uvicorn で 127.0.0.1:8000 にバインド（外部非公開） |

## 前提条件

- AWS CLI 設定済み（`aws sts get-caller-identity` で確認）
- Terraform 1.6 以上インストール済み
- 自分のグローバル IP アドレス確認済み（`curl -s https://checkip.amazonaws.com`）

---

## 1. Terraform でインフラ構築

```bash
cd infra/terraform
terraform init
terraform apply -var="my_ip=XXX.XXX.XXX.XXX/32"
# db_password を対話入力（ファイルに書かない）
```

> **注意:** `db_password` のプロンプトは Bash ツール経由では入力できない。
> 環境変数 `TF_VAR_db_password` で渡すか、ターミナルで直接実行する。

apply 完了後の出力値:

| 出力 | 内容 |
|------|------|
| `ec2_public_ip` | EC2 パブリック IP |
| `ssh_command` | SSH 接続コマンド（.pem パス込み） |
| `app_url` | `http://EC2_IP` |
| `rds_endpoint` | RDS エンドポイント |

> **EC2 IP はインスタンス再起動で変わる。** Elastic IP は有料のため今回は使用しない。

### terraform apply 直後の確認

user_data.sh の実行結果を必ず確認する（完了まで約5〜10分）:

```bash
aws ec2 get-console-output --instance-id <ID> --region ap-northeast-1 \
  --query 'Output' --output text | tail -30
```

**"Failed to run module scripts-user"** が含まれていたら user_data.sh が途中で失敗している。
HTTP 疎通確認の前にコンソールログを確認することで早期検出できる。

---

## 2. EC2 への接続と初期セットアップ

### SSH 接続

```bash
ssh -i infra/terraform/budgeting-app-key.pem ec2-user@<EC2_IP>
```

### スワップファイルの追加（pip install 安定化）

```bash
sudo dd if=/dev/zero of=/swapfile bs=128M count=16
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

> **注意:** スワップを追加しても `npm run build` の OOM は解決しない。
> Node.js の V8 ヒープ上限は OS メモリ+スワップではなく `--max-old-space-size` で制御されるため。

### リポジトリ取得

```bash
git clone https://github.com/cxl03157-afk/budgeting_app.git
```

---

## 3. フロントエンド配置

> **t2.micro（1GB RAM）では `npm run build` が OOM でクラッシュする。**
> ローカルでビルドして SCP でアップロードする。

**ローカルマシンで実行:**

```bash
cd frontend
npm run build
scp -i infra/terraform/budgeting-app-key.pem \
  -r dist/* ec2-user@<EC2_IP>:/tmp/dist/
```

**EC2 上で実行:**

```bash
sudo cp -r /tmp/dist/* /usr/share/nginx/html/
```

---

## 4. Nginx 設定

```bash
sudo tee /etc/nginx/conf.d/budgeting.conf > /dev/null << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
sudo nginx -t && sudo systemctl reload nginx
```

`/api/` の末尾スラッシュにより FastAPI 側では `/api/` プレフィックスが除去される
（vite.config.ts の `rewrite: path.replace(/^\/api/, '')` と同じ動作）。

---

## 5. バックエンド環境構築

```bash
cd ~/budgeting_app/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### .env ファイル作成

```bash
echo "DATABASE_URL=mysql+pymysql://app:<PASSWORD>@<RDS_ENDPOINT>:3306/budgeting" > .env
```

---

## 6. DB スキーマ初期化

```bash
mysql -h <RDS_ENDPOINT> -u app -p<PASSWORD> budgeting \
  < ~/budgeting_app/docker/init.sql
```

`init.sql` には CREATE USER / GRANT / DROP / TRUNCATE は含まれないため、RDS で直接実行可能。

---

## 7. FastAPI systemd サービス

```bash
sudo tee /etc/systemd/system/budgeting-api.service > /dev/null << 'EOF'
[Unit]
Description=Budgeting App API (FastAPI)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/budgeting_app/backend
EnvironmentFile=/home/ec2-user/budgeting_app/backend/.env
ExecStart=/home/ec2-user/budgeting_app/backend/.venv/bin/uvicorn main:app \
    --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable budgeting-api
sudo systemctl start budgeting-api
sudo systemctl status budgeting-api
```

---

## 8. 動作確認

```bash
# Vue.js が返るか
curl -s -o /dev/null -w "%{http_code}" http://<EC2_IP>/

# FastAPI（Nginx 経由）が返るか
curl -s http://<EC2_IP>/api/categories | head -c 100
```

---

## 停止・削除

```bash
cd infra/terraform
terraform destroy -var="my_ip=XXX.XXX.XXX.XXX/32"
```

> **無料枠は12ヶ月間。** 期限後は課金が発生するため、不要なリソースは `terraform destroy` で削除する。
> Billing アラートの設定を推奨。

---

## AL2023 固有の注意事項

| 事象 | 原因 | 対処 |
|------|------|------|
| `dnf install -y mysql` が失敗 | AL2023 に `mysql` パッケージは存在しない | `mariadb105` を使用（MySQL 互換） |
| `git` がデフォルトで入っていない | AL2023 の最小インストール | `dnf install -y git` を user_data.sh に追加 |
| `npm run build` が OOM でクラッシュ | t2.micro 1GB RAM では V8 ヒープ不足 | ローカルビルド + SCP でアップロード |
