USE budgeting;
SET NAMES utf8mb4;

-- 冪等にするため既存データをリセット
-- original_id の自己参照 FK があるため FOREIGN_KEY_CHECKS を一時無効化
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE transactions;
SET FOREIGN_KEY_CHECKS = 1;

-- category_id 対応:
--  1=食費, 2=日用品, 3=娯楽費, 4=交通費, 5=衣類・美容
--  6=医療・健康, 9=水道・光熱費, 10=住居費, 13=通信費, 15=収入

-- 2026年4月
INSERT INTO transactions (type, amount, date, category_id, memo) VALUES
  ('income',  280000, '2026-04-01', 15, '給与'),
  ('expense',  80000, '2026-04-05', 10, '家賃'),
  ('expense',  38000, '2026-04-10',  1, 'スーパー'),
  ('expense',   9800, '2026-04-15',  4, '定期券'),
  ('expense',   6500, '2026-04-20',  3, '映画・外食');

-- 2026年5月
INSERT INTO transactions (type, amount, date, category_id, memo) VALUES
  ('income',  300000, '2026-05-01', 15, '給与'),
  ('income',   20000, '2026-05-10', 15, '副業'),
  ('expense',  80000, '2026-05-05', 10, '家賃'),
  ('expense',  45000, '2026-05-08',  1, 'スーパー'),
  ('expense',  12000, '2026-05-12',  4, '交通費'),
  ('expense',   8000, '2026-05-18',  3, '映画・外食'),
  ('expense',  15000, '2026-05-20',  2, 'ドラッグストア'),
  ('expense',   7500, '2026-05-25', 13, '携帯料金'),
  ('expense',  12000, '2026-05-28',  9, '電気・ガス');
