-- ============================================================================
-- PlateWise - Member 2, 3 & 4 Integrated Database Schema Migration
-- File: 14_comprehensive_schema_integration.sql
-- Modules:
--   - Member 2: Ordering, Billing, Payments & Checkout Integration
--   - Member 3: Zero-Waste Food Management, NGO Claims & Pay-It-Forward Ledger
--   - Member 4: Kitchen Batch Inventory Tracking & Waste Analytics
--
-- Rules:
--   1. Additive & Non-Destructive: No DROP TABLE, no DROP COLUMN, no TRUNCATE.
--   2. Strict Idempotency: Safe to re-run multiple times without errors.
--   3. Topological Dependency Order: Parent tables created before dependent child FKs.
--   4. Node.js mysql2 Compatible: Pure SQL without MySQL CLI DELIMITER directives.
--   5. Historical Data Preservation: Preserves all existing records intact.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Enhance food_batches Table (Batch Lifecycle Status)
-- ----------------------------------------------------------------------------
SET @fb_status_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'food_batches' AND COLUMN_NAME = 'status'
);
SET @fb_status_sql = IF(
    @fb_status_exists = 0,
    "ALTER TABLE food_batches ADD COLUMN status ENUM('Active', 'Surplus', 'Depleted', 'Expired', 'Discarded') NOT NULL DEFAULT 'Active' AFTER leftover_qty",
    "SELECT 1"
);
PREPARE stmt_fb_status FROM @fb_status_sql;
EXECUTE stmt_fb_status;
DEALLOCATE PREPARE stmt_fb_status;

-- Index for food_batches menu and batch date
SET @fb_idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'food_batches' AND INDEX_NAME = 'idx_batches_menu_date'
);
SET @fb_idx_sql = IF(
    @fb_idx_exists = 0,
    "ALTER TABLE food_batches ADD INDEX idx_batches_menu_date (menu_item_id, batch_date)",
    "SELECT 1"
);
PREPARE stmt_fb_idx FROM @fb_idx_sql;
EXECUTE stmt_fb_idx;
DEALLOCATE PREPARE stmt_fb_idx;

-- ----------------------------------------------------------------------------
-- STEP 2: Enhance orders Table (Billing Totals, Discounts & Payment Integration)
-- ----------------------------------------------------------------------------
-- 2.1 Add total_amount
SET @ord_total_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'total_amount'
);
SET @ord_total_sql = IF(
    @ord_total_exists = 0,
    "ALTER TABLE orders ADD COLUMN total_amount DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER user_id",
    "SELECT 1"
);
PREPARE stmt_ord_total FROM @ord_total_sql;
EXECUTE stmt_ord_total;
DEALLOCATE PREPARE stmt_ord_total;

-- 2.2 Add discount_amount
SET @ord_disc_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_amount'
);
SET @ord_disc_sql = IF(
    @ord_disc_exists = 0,
    "ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER total_amount",
    "SELECT 1"
);
PREPARE stmt_ord_disc FROM @ord_disc_sql;
EXECUTE stmt_ord_disc;
DEALLOCATE PREPARE stmt_ord_disc;

-- 2.3 Add final_amount
SET @ord_final_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'final_amount'
);
SET @ord_final_sql = IF(
    @ord_final_exists = 0,
    "ALTER TABLE orders ADD COLUMN final_amount DECIMAL(8,2) NOT NULL DEFAULT 0.00 AFTER discount_amount",
    "SELECT 1"
);
PREPARE stmt_ord_final FROM @ord_final_sql;
EXECUTE stmt_ord_final;
DEALLOCATE PREPARE stmt_ord_final;

-- 2.4 Add payment_method
SET @ord_pm_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_method'
);
SET @ord_pm_sql = IF(
    @ord_pm_exists = 0,
    "ALTER TABLE orders ADD COLUMN payment_method ENUM('cash_on_pickup', 'upi_simulated', 'card_simulated', 'netbanking_simulated', 'credit_funded') NOT NULL DEFAULT 'cash_on_pickup' AFTER payment_status",
    "SELECT 1"
);
PREPARE stmt_ord_pm FROM @ord_pm_sql;
EXECUTE stmt_ord_pm;
DEALLOCATE PREPARE stmt_ord_pm;

-- 2.5 Expand payment_status ENUM to include 'Refunded'
SET @ord_ps_type = (
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_status'
);
SET @ord_ps_sql = IF(
    @ord_ps_type NOT LIKE '%Refunded%',
    "ALTER TABLE orders MODIFY COLUMN payment_status ENUM('Paid', 'Pending', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending'",
    "SELECT 1"
);
PREPARE stmt_ord_ps FROM @ord_ps_sql;
EXECUTE stmt_ord_ps;
DEALLOCATE PREPARE stmt_ord_ps;

-- 2.6 Safe Backfill of orders total_amount and final_amount for historical records
UPDATE orders o
SET total_amount = COALESCE((SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = o.order_id), 0.00),
    discount_amount = 0.00,
    final_amount = COALESCE((SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = o.order_id), 0.00)
WHERE total_amount = 0.00 AND EXISTS (SELECT 1 FROM order_items WHERE order_id = o.order_id);

-- 2.7 Add CHECK constraints for orders
SET @ord_chk_b_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND CONSTRAINT_NAME = 'chk_order_amount_bounds'
);
SET @ord_chk_b_sql = IF(
    @ord_chk_b_exists = 0,
    "ALTER TABLE orders ADD CONSTRAINT chk_order_amount_bounds CHECK (total_amount >= 0.00 AND discount_amount >= 0.00 AND final_amount >= 0.00)",
    "SELECT 1"
);
PREPARE stmt_ord_chk_b FROM @ord_chk_b_sql;
EXECUTE stmt_ord_chk_b;
DEALLOCATE PREPARE stmt_ord_chk_b;

SET @ord_chk_m_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND CONSTRAINT_NAME = 'chk_order_math'
);
SET @ord_chk_m_sql = IF(
    @ord_chk_m_exists = 0,
    "ALTER TABLE orders ADD CONSTRAINT chk_order_math CHECK (final_amount = ROUND(GREATEST(total_amount - discount_amount, 0.00), 2))",
    "SELECT 1"
);
PREPARE stmt_ord_chk_m FROM @ord_chk_m_sql;
EXECUTE stmt_ord_chk_m;
DEALLOCATE PREPARE stmt_ord_chk_m;

-- ----------------------------------------------------------------------------
-- STEP 3: Enhance order_items Table (Batch Attribution & Surplus Pricing)
-- ----------------------------------------------------------------------------
-- 3.1 Add food_batch_id
SET @oi_batch_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'food_batch_id'
);
SET @oi_batch_sql = IF(
    @oi_batch_exists = 0,
    "ALTER TABLE order_items ADD COLUMN food_batch_id INT NULL AFTER menu_item_id",
    "SELECT 1"
);
PREPARE stmt_oi_batch FROM @oi_batch_sql;
EXECUTE stmt_oi_batch;
DEALLOCATE PREPARE stmt_oi_batch;

-- 3.2 Add original_price (preserves catalog price when surplus discount applied)
SET @oi_orig_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'original_price'
);
SET @oi_orig_sql = IF(
    @oi_orig_exists = 0,
    "ALTER TABLE order_items ADD COLUMN original_price DECIMAL(8,2) NULL AFTER unit_price",
    "SELECT 1"
);
PREPARE stmt_oi_orig FROM @oi_orig_sql;
EXECUTE stmt_oi_orig;
DEALLOCATE PREPARE stmt_oi_orig;

-- 3.3 Add is_surplus flag
SET @oi_surplus_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'is_surplus'
);
SET @oi_surplus_sql = IF(
    @oi_surplus_exists = 0,
    "ALTER TABLE order_items ADD COLUMN is_surplus TINYINT(1) NOT NULL DEFAULT 0 AFTER original_price",
    "SELECT 1"
);
PREPARE stmt_oi_surplus FROM @oi_surplus_sql;
EXECUTE stmt_oi_surplus;
DEALLOCATE PREPARE stmt_oi_surplus;

-- 3.4 Add FK fk_order_items_batch
SET @oi_fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND CONSTRAINT_NAME = 'fk_order_items_batch'
);
SET @oi_fk_sql = IF(
    @oi_fk_exists = 0,
    "ALTER TABLE order_items ADD CONSTRAINT fk_order_items_batch FOREIGN KEY (food_batch_id) REFERENCES food_batches(food_batch_id) ON DELETE RESTRICT",
    "SELECT 1"
);
PREPARE stmt_oi_fk FROM @oi_fk_sql;
EXECUTE stmt_oi_fk;
DEALLOCATE PREPARE stmt_oi_fk;

-- 3.5 Add index idx_order_items_batch
SET @oi_idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND INDEX_NAME = 'idx_order_items_batch'
);
SET @oi_idx_sql = IF(
    @oi_idx_exists = 0,
    "ALTER TABLE order_items ADD INDEX idx_order_items_batch (food_batch_id)",
    "SELECT 1"
);
PREPARE stmt_oi_idx FROM @oi_idx_sql;
EXECUTE stmt_oi_idx;
DEALLOCATE PREPARE stmt_oi_idx;

-- ----------------------------------------------------------------------------
-- STEP 4: Enhance donations Table (Deadlines, Claim Tracking & Lifecycle States)
-- ----------------------------------------------------------------------------
-- 4.1 Add collection_deadline
SET @don_dl_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donations' AND COLUMN_NAME = 'collection_deadline'
);
SET @don_dl_sql = IF(
    @don_dl_exists = 0,
    "ALTER TABLE donations ADD COLUMN collection_deadline DATETIME NULL AFTER quantity",
    "SELECT 1"
);
PREPARE stmt_don_dl FROM @don_dl_sql;
EXECUTE stmt_don_dl;
DEALLOCATE PREPARE stmt_don_dl;

-- 4.2 Add claimed_quantity
SET @don_cq_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donations' AND COLUMN_NAME = 'claimed_quantity'
);
SET @don_cq_sql = IF(
    @don_cq_exists = 0,
    "ALTER TABLE donations ADD COLUMN claimed_quantity INT NOT NULL DEFAULT 0 AFTER quantity",
    "SELECT 1"
);
PREPARE stmt_don_cq FROM @don_cq_sql;
EXECUTE stmt_don_cq;
DEALLOCATE PREPARE stmt_don_cq;

-- 4.3 Expand status ENUM preserving existing values (Guarded with information_schema check)
SET @don_st_type = (
    SELECT COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'donations'
      AND COLUMN_NAME = 'status'
);
SET @don_st_sql = IF(
    @don_st_type NOT LIKE '%Fully Claimed%',
    "ALTER TABLE donations MODIFY COLUMN status ENUM('Available', 'Claimed', 'Fully Claimed', 'Partially Collected', 'Completed', 'Collected', 'Expired', 'Revoked') NOT NULL DEFAULT 'Available'",
    "SELECT 1"
);
PREPARE stmt_don_st FROM @don_st_sql;
EXECUTE stmt_don_st;
DEALLOCATE PREPARE stmt_don_st;

-- 4.4 Backfill claimed_quantity for historical Claimed donations
UPDATE donations
SET claimed_quantity = quantity
WHERE status = 'Claimed' AND claimed_quantity = 0;

-- 4.5 Backfill collection_deadline for historical donations (default: 18:30 IST on donated_at date)
UPDATE donations
SET collection_deadline = TIMESTAMP(DATE(donated_at), '18:30:00')
WHERE collection_deadline IS NULL;

-- 4.6 Add CHECK constraint chk_donation_quantities
SET @don_chk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donations' AND CONSTRAINT_NAME = 'chk_donation_quantities'
);
SET @don_chk_sql = IF(
    @don_chk_exists = 0,
    "ALTER TABLE donations ADD CONSTRAINT chk_donation_quantities CHECK (claimed_quantity >= 0 AND claimed_quantity <= quantity)",
    "SELECT 1"
);
PREPARE stmt_don_chk FROM @don_chk_sql;
EXECUTE stmt_don_chk;
DEALLOCATE PREPARE stmt_don_chk;

-- 4.7 Add index idx_donations_status_deadline
SET @don_idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donations' AND INDEX_NAME = 'idx_donations_status_deadline'
);
SET @don_idx_sql = IF(
    @don_idx_exists = 0,
    "ALTER TABLE donations ADD INDEX idx_donations_status_deadline (status, collection_deadline)",
    "SELECT 1"
);
PREPARE stmt_don_idx FROM @don_idx_sql;
EXECUTE stmt_don_idx;
DEALLOCATE PREPARE stmt_don_idx;

-- ----------------------------------------------------------------------------
-- STEP 5: Enhance waste_logs Table (Categories, User Attribution & Auditability)
-- ----------------------------------------------------------------------------
-- 5.1 Add category
SET @wl_cat_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waste_logs' AND COLUMN_NAME = 'category'
);
SET @wl_cat_sql = IF(
    @wl_cat_exists = 0,
    "ALTER TABLE waste_logs ADD COLUMN category ENUM('Expired_Unclaimed', 'Expired_Uncollected', 'Preparation_Waste', 'Contamination', 'Post_Service_Leftover') NOT NULL DEFAULT 'Post_Service_Leftover' AFTER quantity",
    "SELECT 1"
);
PREPARE stmt_wl_cat FROM @wl_cat_sql;
EXECUTE stmt_wl_cat;
DEALLOCATE PREPARE stmt_wl_cat;

-- 5.2 Add logged_by (Nullable for historical preservation)
SET @wl_lb_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waste_logs' AND COLUMN_NAME = 'logged_by'
);
SET @wl_lb_sql = IF(
    @wl_lb_exists = 0,
    "ALTER TABLE waste_logs ADD COLUMN logged_by INT NULL AFTER category",
    "SELECT 1"
);
PREPARE stmt_wl_lb FROM @wl_lb_sql;
EXECUTE stmt_wl_lb;
DEALLOCATE PREPARE stmt_wl_lb;

-- 5.3 Add reason
SET @wl_rsn_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waste_logs' AND COLUMN_NAME = 'reason'
);
SET @wl_rsn_sql = IF(
    @wl_rsn_exists = 0,
    "ALTER TABLE waste_logs ADD COLUMN reason TEXT NULL AFTER logged_by",
    "SELECT 1"
);
PREPARE stmt_wl_rsn FROM @wl_rsn_sql;
EXECUTE stmt_wl_rsn;
DEALLOCATE PREPARE stmt_wl_rsn;

-- 5.4 Add FK fk_waste_logs_user
SET @wl_fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'waste_logs' AND CONSTRAINT_NAME = 'fk_waste_logs_user'
);
SET @wl_fk_sql = IF(
    @wl_fk_exists = 0,
    "ALTER TABLE waste_logs ADD CONSTRAINT fk_waste_logs_user FOREIGN KEY (logged_by) REFERENCES users(user_id) ON DELETE SET NULL",
    "SELECT 1"
);
PREPARE stmt_wl_fk FROM @wl_fk_sql;
EXECUTE stmt_wl_fk;
DEALLOCATE PREPARE stmt_wl_fk;

-- ----------------------------------------------------------------------------
-- STEP 6: Create meal_sponsorships Table (Pay-It-Forward Sponsorships)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_sponsorships (
    sponsorship_id INT AUTO_INCREMENT PRIMARY KEY,
    sponsor_user_id INT NULL,
    donor_name VARCHAR(100) NULL,
    donor_email VARCHAR(150) NULL,
    total_amount DECIMAL(8,2) NOT NULL,
    meal_unit_price DECIMAL(8,2) NOT NULL DEFAULT 40.00,
    meals_funded INT NOT NULL,
    payment_status ENUM('Pending', 'Paid', 'Failed') NOT NULL DEFAULT 'Pending',
    is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
    message VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sponsorship_user FOREIGN KEY (sponsor_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_sponsorship_amounts CHECK (total_amount > 0.00 AND meal_unit_price > 0.00 AND meals_funded > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @idx_spon_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meal_sponsorships' AND INDEX_NAME = 'idx_sponsorship_status_created'
);
SET @idx_spon_sql = IF(
    @idx_spon_exists = 0,
    "ALTER TABLE meal_sponsorships ADD INDEX idx_sponsorship_status_created (payment_status, created_at)",
    "SELECT 1"
);
PREPARE stmt_idx_spon FROM @idx_spon_sql;
EXECUTE stmt_idx_spon;
DEALLOCATE PREPARE stmt_idx_spon;

-- ----------------------------------------------------------------------------
-- STEP 7: Create meal_credits Table (Student Meal Credit Pools)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_credits (
    credit_id INT AUTO_INCREMENT PRIMARY KEY,
    sponsorship_id INT NOT NULL,
    beneficiary_user_id INT NULL,
    initial_value DECIMAL(8,2) NOT NULL,
    balance DECIMAL(8,2) NOT NULL,
    status ENUM('Active', 'Depleted', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_credits_sponsorship FOREIGN KEY (sponsorship_id) REFERENCES meal_sponsorships(sponsorship_id) ON DELETE RESTRICT,
    CONSTRAINT fk_credits_beneficiary FOREIGN KEY (beneficiary_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chk_credit_initial_value CHECK (initial_value > 0.00),
    CONSTRAINT chk_credit_balance CHECK (balance >= 0.00 AND balance <= initial_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @idx_cred_pool_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'meal_credits' AND INDEX_NAME = 'idx_credits_pool'
);
SET @idx_cred_pool_sql = IF(
    @idx_cred_pool_exists = 0,
    "ALTER TABLE meal_credits ADD INDEX idx_credits_pool (status, expires_at, beneficiary_user_id)",
    "SELECT 1"
);
PREPARE stmt_idx_cred_pool FROM @idx_cred_pool_sql;
EXECUTE stmt_idx_cred_pool;
DEALLOCATE PREPARE stmt_idx_cred_pool;

-- ----------------------------------------------------------------------------
-- STEP 8: Create credit_ledger_entries Table (Immutable Audit Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_ledger_entries (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    credit_id INT NOT NULL,
    order_id INT NULL,
    entry_type ENUM('MINT', 'REDEMPTION', 'REVERSAL', 'EXPIRATION', 'CANCELLATION', 'ADJUSTMENT') NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    balance_before DECIMAL(8,2) NOT NULL,
    balance_after DECIMAL(8,2) NOT NULL,
    performed_by INT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_credit FOREIGN KEY (credit_id) REFERENCES meal_credits(credit_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_user FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT uq_ledger_idempotency UNIQUE (idempotency_key),
    CONSTRAINT chk_ledger_balances CHECK (balance_before >= 0.00 AND balance_after >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @idx_led_cred_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_ledger_entries' AND INDEX_NAME = 'idx_ledger_credit_created'
);
SET @idx_led_cred_sql = IF(
    @idx_led_cred_exists = 0,
    "ALTER TABLE credit_ledger_entries ADD INDEX idx_ledger_credit_created (credit_id, created_at)",
    "SELECT 1"
);
PREPARE stmt_idx_led_cred FROM @idx_led_cred_sql;
EXECUTE stmt_idx_led_cred;
DEALLOCATE PREPARE stmt_idx_led_cred;

SET @idx_led_ord_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_ledger_entries' AND INDEX_NAME = 'idx_ledger_order'
);
SET @idx_led_ord_sql = IF(
    @idx_led_ord_exists = 0,
    "ALTER TABLE credit_ledger_entries ADD INDEX idx_ledger_order (order_id)",
    "SELECT 1"
);
PREPARE stmt_idx_led_ord FROM @idx_led_ord_sql;
EXECUTE stmt_idx_led_ord;
DEALLOCATE PREPARE stmt_idx_led_ord;

-- ----------------------------------------------------------------------------
-- STEP 9: Create credit_redemptions Table (Order-Credit Junction)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_redemptions (
    redemption_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    credit_id INT NOT NULL,
    amount_redeemed DECIMAL(8,2) NOT NULL,
    status ENUM('Active', 'Reversed') NOT NULL DEFAULT 'Active',
    redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemptions_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_redemptions_credit FOREIGN KEY (credit_id) REFERENCES meal_credits(credit_id) ON DELETE RESTRICT,
    CONSTRAINT chk_redemption_amount CHECK (amount_redeemed > 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @idx_red_ord_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_redemptions' AND INDEX_NAME = 'idx_redemptions_order'
);
SET @idx_red_ord_sql = IF(
    @idx_red_ord_exists = 0,
    "ALTER TABLE credit_redemptions ADD INDEX idx_redemptions_order (order_id)",
    "SELECT 1"
);
PREPARE stmt_idx_red_ord FROM @idx_red_ord_sql;
EXECUTE stmt_idx_red_ord;
DEALLOCATE PREPARE stmt_idx_red_ord;

SET @idx_red_cred_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_redemptions' AND INDEX_NAME = 'idx_redemptions_credit'
);
SET @idx_red_cred_sql = IF(
    @idx_red_cred_exists = 0,
    "ALTER TABLE credit_redemptions ADD INDEX idx_redemptions_credit (credit_id)",
    "SELECT 1"
);
PREPARE stmt_idx_red_cred FROM @idx_red_cred_sql;
EXECUTE stmt_idx_red_cred;
DEALLOCATE PREPARE stmt_idx_red_cred;

-- ----------------------------------------------------------------------------
-- STEP 10: Create donation_claims Table (Child Claims for Donations)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donation_claims (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    ngo_id INT NOT NULL,
    quantity INT NOT NULL,
    verification_code VARCHAR(16) NOT NULL,
    status ENUM('Claimed', 'Collected', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Claimed',
    cancellation_reason VARCHAR(255) NULL,
    claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    collected_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    CONSTRAINT fk_claims_donation FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE RESTRICT,
    CONSTRAINT fk_claims_ngo FOREIGN KEY (ngo_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT uq_claim_code UNIQUE (verification_code),
    CONSTRAINT chk_claim_quantity CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @idx_clm_don_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donation_claims' AND INDEX_NAME = 'idx_claims_donation_status'
);
SET @idx_clm_don_sql = IF(
    @idx_clm_don_exists = 0,
    "ALTER TABLE donation_claims ADD INDEX idx_claims_donation_status (donation_id, status)",
    "SELECT 1"
);
PREPARE stmt_idx_clm_don FROM @idx_clm_don_sql;
EXECUTE stmt_idx_clm_don;
DEALLOCATE PREPARE stmt_idx_clm_don;

SET @idx_clm_ngo_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donation_claims' AND INDEX_NAME = 'idx_claims_ngo_status'
);
SET @idx_clm_ngo_sql = IF(
    @idx_clm_ngo_exists = 0,
    "ALTER TABLE donation_claims ADD INDEX idx_claims_ngo_status (ngo_id, status)",
    "SELECT 1"
);
PREPARE stmt_idx_clm_ngo FROM @idx_clm_ngo_sql;
EXECUTE stmt_idx_clm_ngo;
DEALLOCATE PREPARE stmt_idx_clm_ngo;

-- ----------------------------------------------------------------------------
-- STEP 11: Create payments Table (Non-Polymorphic Financial Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NULL,
    sponsorship_id INT NULL,
    user_id INT NULL,
    amount DECIMAL(8,2) NOT NULL,
    payment_method ENUM('cash_on_pickup', 'upi_simulated', 'card_simulated', 'netbanking_simulated') NOT NULL,
    status ENUM('Pending', 'Completed', 'Failed', 'Refunded') NOT NULL DEFAULT 'Completed',
    attempt_number INT NOT NULL DEFAULT 1,
    transaction_reference VARCHAR(100) NOT NULL,
    gateway_provider VARCHAR(50) NOT NULL DEFAULT 'internal_simulated',
    gateway_response_payload JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_sponsorship FOREIGN KEY (sponsorship_id) REFERENCES meal_sponsorships(sponsorship_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT uq_payment_reference UNIQUE (transaction_reference),
    CONSTRAINT chk_payment_parent_target CHECK (
        (order_id IS NOT NULL AND sponsorship_id IS NULL) OR
        (order_id IS NULL AND sponsorship_id IS NOT NULL)
    ),
    CONSTRAINT chk_payment_amount CHECK (amount > 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @idx_pay_ord_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payments_order_attempt'
);
SET @idx_pay_ord_sql = IF(
    @idx_pay_ord_exists = 0,
    "ALTER TABLE payments ADD INDEX idx_payments_order_attempt (order_id, attempt_number)",
    "SELECT 1"
);
PREPARE stmt_idx_pay_ord FROM @idx_pay_ord_sql;
EXECUTE stmt_idx_pay_ord;
DEALLOCATE PREPARE stmt_idx_pay_ord;

SET @idx_pay_spon_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payments_sponsorship'
);
SET @idx_pay_spon_sql = IF(
    @idx_pay_spon_exists = 0,
    "ALTER TABLE payments ADD INDEX idx_payments_sponsorship (sponsorship_id)",
    "SELECT 1"
);
PREPARE stmt_idx_pay_spon FROM @idx_pay_spon_sql;
EXECUTE stmt_idx_pay_spon;
DEALLOCATE PREPARE stmt_idx_pay_spon;
