-- ----------------------------------------------------------------------------
-- PlateWise - Member 4 Database Migration
-- 17_ngo_portal_enhancements.sql
-- Supports NGO Organization Profile & Real-Time Food Rescue Notifications
-- ----------------------------------------------------------------------------

-- 1. Add organization_name column to users if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'organization_name'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE users ADD COLUMN organization_name VARCHAR(150) NULL AFTER full_name",
    'SELECT "Column organization_name already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 2. Add contact_person column to users if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'contact_person'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE users ADD COLUMN contact_person VARCHAR(100) NULL AFTER organization_name",
    'SELECT "Column contact_person already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 3. Add phone_number column to users if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'phone_number'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) NULL AFTER contact_person",
    'SELECT "Column phone_number already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 4. Add address column to users if not exists
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'address'
);

SET @stmt = IF(@col_exists = 0,
    "ALTER TABLE users ADD COLUMN address TEXT NULL AFTER phone_number",
    'SELECT "Column address already exists" AS message'
);
PREPARE alter_stmt FROM @stmt;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;

-- 5. Create ngo_notifications table if not exists
CREATE TABLE IF NOT EXISTS ngo_notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NULL,
    type ENUM(
        'NEW_DONATION',
        'CLAIM_CONFIRMED',
        'CLAIM_CANCELLED',
        'HANDOVER_COMPLETED',
        'DEADLINE_WARNING',
        'DONATION_EXPIRED',
        'AVAILABILITY_CHANGED'
    ) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    related_donation_id INT NULL,
    related_claim_id INT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ngo_notif_ngo_date (ngo_id, created_at),
    INDEX idx_ngo_notif_read (ngo_id, is_read),
    CONSTRAINT fk_ngo_notif_user FOREIGN KEY (ngo_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ngo_notif_donation FOREIGN KEY (related_donation_id) REFERENCES donations(donation_id) ON DELETE SET NULL,
    CONSTRAINT fk_ngo_notif_claim FOREIGN KEY (related_claim_id) REFERENCES donation_claims(claim_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
