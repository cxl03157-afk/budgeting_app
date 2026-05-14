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

-- シードデータ: デフォルトサブカテゴリ
INSERT INTO subcategories (category_id, name) VALUES
  -- 食費 (id=1)
  (1, '食料品'), (1, '外食'), (1, 'カフェ'), (1, '飲み物・お酒'), (1, 'その他食費'),
  -- 日用品 (id=2)
  (2, '洗剤・掃除用品'), (2, 'キッチン用品'), (2, 'その他日用品'),
  -- 娯楽費 (id=3)
  (3, '映画・音楽・ゲーム'), (3, '旅行'), (3, '本'), (3, '趣味'), (3, 'その他娯楽'),
  -- 交通費 (id=4)
  (4, '電車'), (4, 'バス'), (4, 'タクシー'), (4, '飛行機'), (4, 'その他交通費'),
  -- 衣類・美容 (id=5)
  (5, '服'), (5, 'クリーニング'), (5, '理髪'), (5, '美容・化粧品'), (5, 'その他衣類・美容'),
  -- 医療・健康 (id=6)
  (6, '医療費'), (6, '薬'), (6, 'フィットネス'), (6, 'その他医療・健康'),
  -- 自動車費 (id=7)
  (7, '自動車ローン'), (7, 'ガソリン'), (7, '有料道路'), (7, '駐車場'), (7, '自動車保険'), (7, '車検・点検'), (7, 'その他自動車'),
  -- 教育・自己投資 (id=8)
  (8, 'IT機器'), (8, '書籍'), (8, '新聞・雑誌'), (8, '学費'), (8, '塾'), (8, '習い事'), (8, 'その他教育・自己投資'),
  -- 水道・光熱費 (id=9)
  (9, '水道'), (9, '電気'), (9, 'ガス'), (9, 'その他水道・光熱費'),
  -- 住居費 (id=10)
  (10, '住宅ローン'), (10, '家賃'), (10, '管理費'), (10, '地震・火災保険'), (10, 'その他住居費'),
  -- 保険 (id=11)
  (11, '生命保険'), (11, '医療保険'), (11, 'その他保険'),
  -- 交際費 (id=12)
  (12, '飲み会'), (12, '冠婚葬祭'), (12, '贈り物'), (12, 'その他交際費'),
  -- 通信費 (id=13)
  (13, 'スマホ'), (13, 'インターネット'), (13, 'NHK'), (13, 'その他通信費'),
  -- 税・その他 (id=14)
  (14, 'ふるさと納税'),
  -- 収入 (id=15)
  (15, '給与'), (15, 'ボーナス'), (15, '投資利益・配当金'), (15, 'その他収入');
