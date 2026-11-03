-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 10_account_status_migration.sql
-- Idempotent schema migration to add account_status to users table
-- ============================================================================

-- Step 1: Check if account_status column exists in users table using information_schema
SET @status_col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'account_status'
);

-- Step 2: Prepare dynamic statement to add account_status as ENUM('active','pending','rejected') NOT NULL DEFAULT 'active'
SET @add_status_sql = IF(
    @status_col_exists = 0,
    "ALTER TABLE users ADD COLUMN account_status ENUM('active', 'pending', 'rejected') NOT NULL DEFAULT 'active' AFTER role",
    "SELECT 1"
);

PREPARE stmt_add_status FROM @add_status_sql;
EXECUTE stmt_add_status;
DEALLOCATE PREPARE stmt_add_status;

-- Step 3: Ensure all existing users have account_status = 'active'
UPDATE users SET account_status = 'active' WHERE account_status IS NULL;

-- Step 4: Verify migration result
SELECT column_name, data_type, is_nullable, column_type, column_default
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'account_status';
