# 家計簿アプリ（Budgeting App）

収支の記録・集計・可視化を通じて家計管理を支援するシングルユーザー向け Web アプリ。

## 機能一覧

| 機能 | 内容 |
|------|------|
| 収支管理 | 収支の登録・編集・削除。収入/支出区分・カテゴリ・サブカテゴリ・メモを記録 |
| カテゴリ管理 | カテゴリ・サブカテゴリの追加・編集・削除。デフォルトカテゴリ（15件）は削除不可・名前変更可 |
| フィルター | 区分・カテゴリ・期間（月別/週別/年別）による絞り込み |
| ダッシュボード | 収入合計・支出合計・残高の表示。期間切替・カテゴリ別内訳・予算超過アラート |
| グラフ・レポート | カテゴリ別ドーナツグラフ・日別/週別/月別棒グラフ。CSVエクスポート |
| 予算設定 | 月間予算の設定・変更・削除。貯金見込み額の表示 |
| ダークモード | ライト/ダーク切替（設定はブラウザに保存） |

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| フロントエンド | Vue.js 3 + TypeScript + Vuetify 3 | Vue 3.5 / Vuetify 3.12 / TypeScript 6.0 |
| グラフ | Chart.js + vue-chartjs + chartjs-plugin-datalabels | Chart.js 4.5 |
| バックエンド | Python + FastAPI + SQLAlchemy | FastAPI 0.136 / SQLAlchemy 2.0 / Pydantic 2.13 |
| データベース | MySQL 8.4 LTS | — |
| インフラ（ローカル） | Docker Compose | — |

## ディレクトリ構成

```
budgeting_app/
├── backend/          # FastAPI アプリ
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   └── routers/
│       ├── categories.py
│       ├── transactions.py
│       └── budgets.py
├── frontend/         # Vue 3 + TypeScript アプリ
│   └── src/
│       ├── api/index.ts        # API クライアント
│       ├── views/              # 各画面コンポーネント
│       └── plugins/vuetify.ts
├── docker/
│   ├── init.sql      # テーブル定義 + デフォルトデータ
│   └── seed.sql      # 初期化用 TRUNCATE
├── docs/             # 要件定義書・仕様書
├── prototype/        # Vanilla JS プロトタイプ
└── docker-compose.yml
```

## セットアップ・起動手順

### 前提条件

- Docker Desktop
- Node.js 18+
- Python 3.11+

### 1. データベース起動

```bash
docker compose up -d
```

MySQL が `localhost:3306` で起動します（初回起動時に `init.sql` でテーブルとデフォルトデータが自動投入されます）。

### 2. バックエンド起動

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API が `http://localhost:8000` で起動します。  
APIドキュメント（Swagger UI）: `http://localhost:8000/docs`

### 3. フロントエンド起動

```bash
cd frontend
npm install
npm run dev
```

アプリが `http://localhost:5173` で起動します。

## API エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/categories` | カテゴリ一覧（サブカテゴリ含む） |
| POST | `/categories` | カテゴリ追加 |
| PUT | `/categories/{id}` | カテゴリ名・色の変更 |
| DELETE | `/categories/{id}` | カテゴリ削除（デフォルトカテゴリは不可） |
| POST | `/categories/{id}/subcategories` | サブカテゴリ追加 |
| PUT | `/categories/{id}/subcategories/{sub_id}` | サブカテゴリ名変更 |
| DELETE | `/categories/{id}/subcategories/{sub_id}` | サブカテゴリ削除 |
| GET | `/transactions` | 収支一覧（フィルターパラメーター対応） |
| POST | `/transactions` | 収支登録 |
| PUT | `/transactions/{id}` | 収支編集 |
| DELETE | `/transactions/{id}` | 収支削除 |
| GET | `/budgets` | 予算一覧（`?year=YYYY`） |
| POST | `/budgets` | 予算登録 |
| PUT | `/budgets/{id}` | 予算変更 |
| DELETE | `/budgets/{id}` | 予算削除 |
| GET | `/health` | ヘルスチェック |

## データベース

### テーブル構成

```
categories      カテゴリマスタ（デフォルト15件）
subcategories   サブカテゴリ（categoriesを参照）
transactions    収支データ（categories/subcategoriesを参照）
budgets         月間予算（年月でユニーク）
```

### デフォルトカテゴリ

食費 / 日用品 / 娯楽費 / 交通費 / 衣類・美容 / 医療・健康 / 自動車費 / 教育・自己投資 / 水道・光熱費 / 住居費 / 保険 / 交際費 / 通信費 / 税・その他 / 収入

## 開発ワークフロー

詳細は [CLAUDE.md](./CLAUDE.md) を参照。

1. GitHub Issues でタスクを作成
2. ブランチを切る（`feature/issue-{N}-{内容}` など）
3. 実装 → コミット（Conventional Commits）
4. PR 作成 → `Closes #N` を本文に記載
5. レビュー後 main へマージ

## スコープ外

- ユーザー認証・複数ユーザー対応
- 銀行口座・外部サービス連携
- 繰り返し取引の自動生成（DBスキーマのカラムは残存）
- グラフの「収支合計」表示（支出のみ / 収入のみ のみ対応）
- スマートフォン向けレスポンシブ最適化
- レシートOCR・プッシュ通知
