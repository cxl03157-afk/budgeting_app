USE budgeting;
SET NAMES utf8mb4;

-- 冪等にするため既存データをリセット
-- original_id の自己参照 FK があるため FOREIGN_KEY_CHECKS を一時無効化
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE transactions;
TRUNCATE TABLE subcategories;
SET FOREIGN_KEY_CHECKS = 1;
