-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 11_ngo_role_migration.sql
-- Idempotent schema migration to add 'ngo' role to users table
-- and optional claim management fields to donations table
-- ============================================================================

-- Step 1: Check if 'ngo' already exists in users.role ENUM
SET @role_col_type = (
    SELECT COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'role'
);

SET @alter_role_sql = IF(
    @role_col_type LIKE '%ngo%',
    'SELECT "ngo role already present in users.role ENUM" AS status',
    'ALTER TABLE users MODIFY COLUMN role ENUM(\'student\', \'cashier\', \'kitchen\', \'admin\', \'ngo\') NOT NULL DEFAULT \'student\''
);

PREPARE stmt_alter_role FROM @alter_role_sql;
EXECUTE stmt_alter_role;
DEALLOCATE PREPARE stmt_alter_role;

-- Step 2: Add status column to donations table if not present
SET @don_status_col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'donations'
      AND COLUMN_NAME = 'status'
);

SET @add_don_status_sql = IF(
    @don_status_col_exists = 0,
    "ALTER TABLE donations ADD COLUMN status ENUM('Available', 'Claimed', 'Collected') NOT NULL DEFAULT 'Available' AFTER quantity",
    "SELECT 1"
);

PREPARE stmt_add_don_status FROM @add_don_status_sql;
EXECUTE stmt_add_don_status;
DEALLOCATE PREPARE stmt_add_don_status;

-- Step 3: Add claimed_by column to donations table if not present
SET @don_claimed_by_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'donations'
      AND COLUMN_NAME = 'claimed_by'
);

SET @add_don_claimed_by_sql = IF(
    @don_claimed_by_exists = 0,
    "ALTER TABLE donations ADD COLUMN claimed_by INT NULL AFTER status, ADD CONSTRAINT fk_donations_claimed_by FOREIGN KEY (claimed_by) REFERENCES users(user_id) ON DELETE SET NULL",
    "SELECT 1"
);

PREPARE stmt_add_don_claimed_by FROM @add_don_claimed_by_sql;
EXECUTE stmt_add_don_claimed_by;
DEALLOCATE PREPARE stmt_add_don_claimed_by;

-- Step 4: Add claimed_at column to donations table if not present
SET @don_claimed_at_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'donations'
      AND COLUMN_NAME = 'claimed_at'
);

SET @add_don_claimed_at_sql = IF(
    @don_claimed_at_exists = 0,
    "ALTER TABLE donations ADD COLUMN claimed_at TIMESTAMP NULL DEFAULT NULL AFTER claimed_by",
    "SELECT 1"
);

PREPARE stmt_add_don_claimed_at FROM @add_don_claimed_at_sql;
EXECUTE stmt_add_don_claimed_at;
DEALLOCATE PREPARE stmt_add_don_claimed_at;

-- Step 5: Verify migration result
SELECT column_name, data_type, column_type, column_default
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'users' AND COLUMN_NAME = 'role') OR
    (TABLE_NAME = 'donations' AND COLUMN_NAME IN ('status', 'claimed_by', 'claimed_at'))
  );
