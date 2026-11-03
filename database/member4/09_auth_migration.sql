-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 09_auth_migration.sql
-- Idempotent schema migration to add password_hash and ensure email uniqueness
-- ============================================================================

-- Step 1: Check if password_hash column exists in users table using information_schema
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'password_hash'
);

-- Step 2: Prepare dynamic statement to add password_hash as NULLable if missing
SET @add_col_sql = IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER role',
    'SELECT 1'
);

PREPARE stmt_add_col FROM @add_col_sql;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

-- Step 3: Backfill any NULL password_hash rows with non-matching placeholder '!'
-- Users with '!' cannot log in until updated with a real bcrypt hash by the seed script.
UPDATE users SET password_hash = '!' WHERE password_hash IS NULL;

-- Step 4: Alter password_hash to NOT NULL
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;

-- Step 5: Check if unique index on email already exists
SET @email_idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'email'
      AND NON_UNIQUE = 0
);

SET @add_email_idx_sql = IF(
    @email_idx_exists = 0,
    'ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email)',
    'SELECT 1'
);

PREPARE stmt_email_idx FROM @add_email_idx_sql;
EXECUTE stmt_email_idx;
DEALLOCATE PREPARE stmt_email_idx;

-- Verify migration result
SELECT column_name, data_type, is_nullable, column_type
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('email', 'role', 'password_hash');
