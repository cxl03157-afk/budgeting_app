# 使用技術一覧・選定理由

## 1. 技術スタック概要

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | Vue.js 3 + TypeScript + Vuetify 3 | Vue 3.4 / Vuetify 3.x |
| バックエンド | Python + FastAPI + SQLAlchemy | Python 3.12 / FastAPI 0.115 / SQLAlchemy 2.0 |
| バリデーション | Pydantic | 2.7.x |
| マイグレーション | Alembic | 1.13.x |
| MySQL ドライバー | PyMySQL | 1.1.x |
| データベース | MySQL | 8.4 LTS（EOL 2032年4月） |
| インフラ（AWS） | S3+CloudFront / EC2 t2.micro / RDS db.t3.micro | — |
| プロトタイプ | Vanilla JS + localStorage | — |

---

## 2. フロントエンド

### Vue.js 3 + TypeScript

| 項目 | 内容 |
|------|------|
| 選定理由 | コンポーネント指向によるUI分割・リアクティブなデータバインディングが家計簿の即時反映UIに適している |
| TypeScript 採用 | 型安全性の確保・IDEの補完によって学習コストを下げながら品質を維持 |
| 学習目的 | Vue.js の Composition API・リアクティビティシステムを実践的に習得 |

### Vuetify 3

| 項目 | 内容 |
|------|------|
| 選定理由 | Material Design ベースのUIコンポーネントライブラリ。グリッドシステムによるレスポンシブ対応をほぼゼロコストで実現できる |
| 利用コンポーネント例 | v-data-table（収支一覧）・v-chart（Chart.js ラッパー）・v-navigation-drawer（サイドバー）・v-dialog（モーダル） |

### Chart.js

| 項目 | 内容 |
|------|------|
| 選定理由 | 軽量・設定が少なく学習コストが低い。プロトタイプとの継続性を保てる |
| 使用チャート | doughnut（カテゴリ別内訳）・bar（推移） |
| プラグイン | chartjs-plugin-datalabels（割合ラベル表示） |

---

## 3. バックエンド

### Python + FastAPI

| 項目 | 内容 |
|------|------|
| 選定理由 | 型アノテーション・自動Swagger UI生成・高速な開発が可能。家計簿レベルの規模なら過剰スペックにならない |
| エンドポイント設計 | REST API（JSON）。フロントエンドとの疎結合を保つ |
| 学習目的 | FastAPI の依存性注入・Pydantic によるバリデーションを習得 |

### SQLAlchemy

| 項目 | 内容 |
|------|------|
| 選定理由 | Python の標準的なORMで学習資料が豊富。パラメータバインドにより SQLインジェクション対策が容易 |
| 使用スタイル | ORM + Core（集計クエリは Core の `select()` で記述） |

---

## 4. データベース

### MySQL 8.4 LTS

| 項目 | 内容 |
|------|------|
| 選定理由 | AWS RDS の無料枠（db.t3.micro）で運用可能。実務でも普及率が高く SQL 学習に適している |
| バージョン根拠 | MySQL 8.0 は 2026年4月30日 EOL。8.4 LTS は EOL 2032年4月で長期サポート対象 |
| 文字コード | utf8mb4（絵文字・日本語対応） |
| ストレージエンジン | InnoDB（トランザクション・外部キー制約）|

---

## 5. インフラ（AWS）

| サービス | 用途 | 選定理由 |
|---------|------|---------|
| S3 + CloudFront | フロントエンドホスティング | 静的アセットの配信に最適・無料枠でまかなえる |
| EC2 t2.micro | バックエンド（FastAPI）ホスティング | 無料枠（12ヶ月）内で稼働可能 |
| RDS db.t3.micro (MySQL) | データベース | マネージドDBで運用負荷を低減。無料枠で利用可能 |

**構成図（概要）:**

```
ブラウザ
  │
  ├─── HTTPS ──► CloudFront ──► S3
  │                              （Vue.js SPA）
  │
  └─── HTTPS ──► EC2（FastAPI）
                     │
                     └─── MySQL ──► RDS
```

---

## 6. プロトタイプ技術選定

| 項目 | 技術 | 理由 |
|------|------|------|
| 言語 | Vanilla JavaScript | 追加インストール不要・`file://`で直接起動できる |
| データ永続化 | localStorage | バックエンド不要でブラウザ内に完結 |
| グラフ | Chart.js 4 + chartjs-plugin-datalabels | 最終版と同じライブラリで画面イメージを確認 |
| スタイル | カスタムCSS（CSS変数によるダークモード対応） | 外部依存なし・高速プロトタイピング |

プロトタイプは画面仕様の確認を目的とし、最終版への移行時に技術スタックを切り替える。

---

## 7. 開発ツール

| ツール | 用途 |
|--------|------|
| Claude Code | AI支援開発 |
| VS Code | エディタ |
| GitHub | バージョン管理・Issue・PR管理 |
| GitHub Actions | CI（予定） |
