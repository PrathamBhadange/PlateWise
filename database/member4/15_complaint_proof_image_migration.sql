-- ----------------------------------------------------------------------------
-- PlateWise - Member 4 Database Migration
-- 15_complaint_proof_image_migration.sql
-- Adds proof_image column to complaints table for mandatory student grievance evidence
-- ----------------------------------------------------------------------------

SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'complaints'
      AND COLUMN_NAME = 'proof_image'
);

SET @stmt = IF(@col_exists = 0,
    'ALTER TABLE complaints ADD COLUMN proof_image LONGTEXT NULL AFTER description',
    'SELECT "Column proof_image already exists" AS message'
);

PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;
