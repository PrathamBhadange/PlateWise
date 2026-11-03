-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 12_menu_availability_migration.sql
-- Idempotent schema migration to add is_available to menu_items table
-- ============================================================================

-- Step 1: Check if is_available column exists in menu_items table using information_schema
SET @avail_col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menu_items'
      AND COLUMN_NAME = 'is_available'
);

-- Step 2: Prepare dynamic statement to add is_available BOOLEAN NOT NULL DEFAULT TRUE
SET @add_avail_sql = IF(
    @avail_col_exists = 0,
    "ALTER TABLE menu_items ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT TRUE AFTER price",
    "SELECT 1"
);

PREPARE stmt_add_avail FROM @add_avail_sql;
EXECUTE stmt_add_avail;
DEALLOCATE PREPARE stmt_add_avail;

-- Step 3: Ensure all existing menu items have is_available = TRUE
UPDATE menu_items SET is_available = TRUE WHERE is_available IS NULL;

-- Step 4: Verify migration result
SELECT column_name, data_type, is_nullable, column_type, column_default
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'menu_items'
  AND COLUMN_NAME = 'is_available';
