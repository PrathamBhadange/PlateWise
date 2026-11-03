-- ============================================================================
-- PlateWise - Member 2 Database Artifacts
-- 13_pickup_slots_migration.sql
-- Idempotent schema migration for Dynamic Pickup Slot Capacity Management,
-- Overbooking Prevention, and Concurrency-Safe Row Locking.
-- ============================================================================

-- Step 1: Create pickup_slots master configuration table if not present
CREATE TABLE IF NOT EXISTS pickup_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    slot VARCHAR(50) NOT NULL UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity INT NOT NULL DEFAULT 40,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_slot_max_capacity CHECK (max_capacity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create pickup_slot_overrides table for per-date capacity overrides and holiday closures
CREATE TABLE IF NOT EXISTS pickup_slot_overrides (
    override_id INT AUTO_INCREMENT PRIMARY KEY,
    slot_id INT NOT NULL,
    pickup_date DATE NOT NULL,
    max_capacity INT NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_slot_overrides_slot
        FOREIGN KEY (slot_id)
        REFERENCES pickup_slots(slot_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_slot_date_override
        UNIQUE (slot_id, pickup_date),
    CONSTRAINT chk_override_max_capacity
        CHECK (max_capacity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Insert or update standard 30-minute campus canteen pickup slots
INSERT INTO pickup_slots (slot, start_time, end_time, max_capacity, is_active, sort_order)
VALUES
    ('12:00 PM - 12:30 PM', '12:00:00', '12:30:00', 40, TRUE, 1),
    ('12:30 PM - 01:00 PM', '12:30:00', '13:00:00', 40, TRUE, 2),
    ('01:00 PM - 01:30 PM', '13:00:00', '13:30:00', 40, TRUE, 3),
    ('01:30 PM - 02:00 PM', '13:30:00', '14:00:00', 40, TRUE, 4)
ON DUPLICATE KEY UPDATE
    start_time = VALUES(start_time),
    end_time = VALUES(end_time),
    sort_order = VALUES(sort_order);

-- Step 4: Conditionally add index on orders(pickup_date, pickup_slot, status) to optimize capacity counts
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND INDEX_NAME = 'idx_orders_slot_date_status'
);

SET @add_idx_sql = IF(
    @idx_exists = 0,
    'ALTER TABLE orders ADD INDEX idx_orders_slot_date_status (pickup_date, pickup_slot, status)',
    'SELECT 1'
);

PREPARE stmt_add_idx FROM @add_idx_sql;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;

-- Step 5: Verification check
SELECT slot_id, slot, start_time, end_time, max_capacity, is_active, sort_order
FROM pickup_slots
ORDER BY sort_order;
