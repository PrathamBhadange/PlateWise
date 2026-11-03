-- ----------------------------------------------------------------------------
-- PlateWise - Member 4 Database Migration
-- 16_production_batches_enhancement.sql
-- Adds meal session, batch code, notes, and audit timestamps to food_batches
-- Supports Real-Time Production-Based Surplus Food Tracking
-- ----------------------------------------------------------------------------

-- 1. Add meal_session column if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND COLUMN_NAME = 'meal_session'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN meal_session ENUM('Breakfast', 'Lunch', 'Evening', 'Dinner', 'All_Day') NOT NULL DEFAULT 'Lunch' AFTER batch_date",
    'SELECT "Column meal_session already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 2. Add batch_code column if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND COLUMN_NAME = 'batch_code'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN batch_code VARCHAR(64) NULL AFTER meal_session",
    'SELECT "Column batch_code already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3. Add notes column if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND COLUMN_NAME = 'notes'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN notes TEXT NULL AFTER status",
    'SELECT "Column notes already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 4. Add created_by column if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND COLUMN_NAME = 'created_by'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN created_by INT NULL AFTER notes, ADD CONSTRAINT fk_food_batches_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL",
    'SELECT "Column created_by already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 5. Add created_at column if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND COLUMN_NAME = 'created_at'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_by",
    'SELECT "Column created_at already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 6. Add updated_at column if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND COLUMN_NAME = 'updated_at'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at",
    'SELECT "Column updated_at already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 7. Add index on batch_code if not exists
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND INDEX_NAME = 'idx_batches_batch_code'
);

SET @stmt = IF(@idx_exists = 0,
    "ALTER TABLE food_batches ADD INDEX idx_batches_batch_code (batch_code)",
    'SELECT "Index idx_batches_batch_code already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 8. Add index on (menu_item_id, batch_date, meal_session) if not exists
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'food_batches'
      AND INDEX_NAME = 'idx_batches_menu_date_session'
);

SET @stmt = IF(@idx_exists = 0,
    "ALTER TABLE food_batches ADD INDEX idx_batches_menu_date_session (menu_item_id, batch_date, meal_session)",
    'SELECT "Index idx_batches_menu_date_session already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;
