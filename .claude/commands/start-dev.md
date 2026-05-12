# /start-dev

開発サーバーの起動手順。フェーズに応じた手順を実行する。

---

## フェーズ1: プロトタイプ（現在）

```bash
open budgeting_app/prototype/index.html
```

ブラウザで直接開くだけでよい。サーバー起動は不要。

---

## フェーズ2: 最終版（Vue.js + FastAPI + MySQL）

### ポート定義（変更禁止）

| サービス | ポート |
|---------|-------|
| Vue.js (Vite) | 5173 |
| FastAPI | 8000 |
| MySQL (Docker) | 3306 |

ポートが競合している場合は、別ポートへの変更ではなく既存プロセスを終了して対応する。

```bash
# ポート競合の解消
lsof -ti:5173 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### 起動順序

**1. MySQL（Docker）**
```bash
docker compose up -d
```

**2. バックエンド（FastAPI）**
```bash
cd backend
python -m venv .venv          # 初回のみ
source .venv/bin/activate
pip install -r requirements.txt  # 初回のみ
uvicorn main:app --reload --port 8000
```

**3. フロントエンド（Vue.js）**
```bash
cd frontend
npm install    # 初回のみ
npm run dev
```

### 起動確認

| 確認先 | URL |
|-------|-----|
| Vue.js アプリ | http://localhost:5173 |
| FastAPI ドキュメント（Swagger） | http://localhost:8000/docs |
| FastAPI ヘルスチェック | http://localhost:8000/health |
