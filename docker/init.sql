USE budgeting;
SET NAMES utf8mb4;

-- 1. categories（他テーブルから参照される）
CREATE TABLE categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(20)              NOT NULL,
  color      CHAR(7)                  NOT NULL DEFAULT '#6366f1',
  type       ENUM('income','expense') NOT NULL,
  is_default TINYINT(1)               NOT NULL DEFAULT 0,
  created_at DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. subcategories（categories を参照）
CREATE TABLE subcategories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  name        VARCHAR(30)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_name (category_id, name),
  CONSTRAINT fk_subcat_cat FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. transactions（categories / subcategories / 自己参照）
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

-- 4. budgets（独立テーブル）
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

-- シードデータ: カテゴリ 15件
INSERT INTO categories (name, color, type, is_default) VALUES
  ('食費',           '#ef4444', 'expense', 1),
  ('日用品',         '#f97316', 'expense', 1),
  ('娯楽費',         '#eab308', 'expense', 1),
  ('交通費',         '#22c55e', 'expense', 1),
  ('衣類・美容',     '#14b8a6', 'expense', 1),
  ('医療・健康',     '#06b6d4', 'expense', 1),
  ('自動車費',       '#3b82f6', 'expense', 1),
  ('教育・自己投資', '#8b5cf6', 'expense', 1),
  ('水道・光熱費',   '#84cc16', 'expense', 1),
  ('住居費',         '#7c3aed', 'expense', 1),
  ('保険',           '#f59e0b', 'expense', 1),
  ('交際費',         '#0ea5e9', 'expense', 1),
  ('通信費',         '#64748b', 'expense', 1),
  ('税・その他',     '#78716c', 'expense', 1),
  ('収入',           '#10b981', 'income',  1);

