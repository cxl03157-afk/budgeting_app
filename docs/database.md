# データベース設計

## 1. ER 図

```
┌─────────────┐       ┌──────────────────┐
│  categories │       │   transactions   │
├─────────────┤       ├──────────────────┤
│ id (PK)     │◄──────│ category_id (FK) │
│ name        │       │ id (PK)          │
│ color       │       │ type             │
│ type        │       │ amount           │
│ is_default  │       │ date             │
│ created_at  │       │ subcategory_id   │──────┐
└─────────────┘       │ memo             │      │
                      │ recurring        │      │
      ┌───────────────│ auto_generated   │      │
      │  self FK      │ original_id (FK) │      │
      └──────────────►│ created_at       │      │
                      │ updated_at       │      │
                      └──────────────────┘      │
                                                │
┌──────────────────┐                           │
│  subcategories   │◄──────────────────────────┘
├──────────────────┤
│ id (PK)          │
│ category_id (FK) │──► categories
│ name             │
│ created_at       │
└──────────────────┘

┌─────────────┐
│   budgets   │
├─────────────┤
│ id (PK)     │
│ year        │
│ month       │
│ amount      │
│ created_at  │
│ updated_at  │
└─────────────┘
```

---

## 2. テーブル定義

### 2-1. categories（カテゴリ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | INT UNSIGNED AUTO_INCREMENT | NOT NULL | — | PK |
| name | VARCHAR(20) | NOT NULL | — | カテゴリ名 |
| color | CHAR(7) | NOT NULL | `'#6366f1'` | HEXカラーコード |
| type | ENUM('income','expense') | NOT NULL | — | 収入 / 支出 |
| is_default | TINYINT(1) | NOT NULL | `0` | デフォルトカテゴリフラグ |
| created_at | DATETIME | NOT NULL | `CURRENT_TIMESTAMP` | 作成日時 |

```sql
CREATE TABLE categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(20)              NOT NULL,
  color      CHAR(7)                  NOT NULL DEFAULT '#6366f1',
  type       ENUM('income','expense') NOT NULL,
  is_default TINYINT(1)               NOT NULL DEFAULT 0,
  created_at DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2-2. subcategories（サブカテゴリ）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | INT UNSIGNED AUTO_INCREMENT | NOT NULL | — | PK |
| category_id | INT UNSIGNED | NOT NULL | — | FK → categories.id |
| name | VARCHAR(30) | NOT NULL | — | サブカテゴリ名 |
| created_at | DATETIME | NOT NULL | `CURRENT_TIMESTAMP` | 作成日時 |

```sql
CREATE TABLE subcategories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  name        VARCHAR(30)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_name (category_id, name),
  CONSTRAINT fk_subcat_cat FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2-3. transactions（収支）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | INT UNSIGNED AUTO_INCREMENT | NOT NULL | — | PK |
| type | ENUM('income','expense') | NOT NULL | — | 収入 / 支出 |
| amount | INT UNSIGNED | NOT NULL | — | 金額（円） |
| date | DATE | NOT NULL | — | 取引日 |
| category_id | INT UNSIGNED | NOT NULL | — | FK → categories.id |
| subcategory_id | INT UNSIGNED | NULL | NULL | FK → subcategories.id |
| memo | VARCHAR(100) | NULL | NULL | メモ |
| recurring | ENUM('none','weekly','monthly') | NOT NULL | `'none'` | 繰り返し設定 |
| auto_generated | TINYINT(1) | NOT NULL | `0` | 自動生成フラグ |
| original_id | INT UNSIGNED | NULL | NULL | 自FK: 繰り返し原本ID |
| created_at | DATETIME | NOT NULL | `CURRENT_TIMESTAMP` | 作成日時 |
| updated_at | DATETIME | NOT NULL | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新日時 |

```sql
CREATE TABLE transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type            ENUM('income','expense')         NOT NULL,
  amount          INT UNSIGNED                     NOT NULL,
  date            DATE                             NOT NULL,
  category_id     INT UNSIGNED                     NOT NULL,
  subcategory_id  INT UNSIGNED                     NULL DEFAULT NULL,
  memo            VARCHAR(100)                     NULL DEFAULT NULL,
  recurring       ENUM('none','weekly','monthly')  NOT NULL DEFAULT 'none',
  auto_generated  TINYINT(1)                       NOT NULL DEFAULT 0,
  original_id     INT UNSIGNED                     NULL DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_category (category_id),
  CONSTRAINT fk_tx_cat    FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tx_subcat FOREIGN KEY (subcategory_id)
    REFERENCES subcategories(id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_orig   FOREIGN KEY (original_id)
    REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2-4. budgets（予算）

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | INT UNSIGNED AUTO_INCREMENT | NOT NULL | — | PK |
| year | SMALLINT UNSIGNED | NOT NULL | — | 対象年 |
| month | TINYINT UNSIGNED | NOT NULL | — | 対象月（1〜12） |
| amount | INT UNSIGNED | NOT NULL | — | 予算額（円） |
| created_at | DATETIME | NOT NULL | `CURRENT_TIMESTAMP` | 作成日時 |
| updated_at | DATETIME | NOT NULL | `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` | 更新日時 |

```sql
CREATE TABLE budgets (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  year       SMALLINT UNSIGNED NOT NULL,
  month      TINYINT UNSIGNED  NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount     INT UNSIGNED      NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
             ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_year_month (year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. 主要クエリ例

### 月間収支集計

```sql
SELECT
  type,
  SUM(amount) AS total
FROM transactions
WHERE date BETWEEN '2026-05-01' AND '2026-05-31'
GROUP BY type;
```

### カテゴリ別集計（支出）

```sql
SELECT
  c.name  AS category,
  SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.type = 'expense'
  AND t.date BETWEEN '2026-05-01' AND '2026-05-31'
GROUP BY c.id, c.name
ORDER BY total DESC;
```

### 月間予算取得

```sql
SELECT amount FROM budgets WHERE year = 2026 AND month = 5;
```

---

## 4. 初期データ（categories シード）

```sql
INSERT INTO categories (name, color, type, is_default) VALUES
  ('食費',         '#ef4444', 'expense', 1),
  ('日用品',       '#f97316', 'expense', 1),
  ('娯楽費',       '#eab308', 'expense', 1),
  ('交通費',       '#22c55e', 'expense', 1),
  ('衣類・美容',   '#14b8a6', 'expense', 1),
  ('医療・健康',   '#06b6d4', 'expense', 1),
  ('自動車費',     '#3b82f6', 'expense', 1),
  ('教育・自己投資','#8b5cf6','expense', 1),
  ('水道・光熱費', '#ec4899', 'expense', 1),
  ('住居費',       '#f43f5e', 'expense', 1),
  ('保険',         '#6366f1', 'expense', 1),
  ('交際費',       '#a855f7', 'expense', 1),
  ('通信費',       '#64748b', 'expense', 1),
  ('税・その他',   '#78716c', 'expense', 1),
  ('収入',         '#10b981', 'income',  1);
```
