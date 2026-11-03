-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 02_member4_schema.sql
-- Production schema for Member 4: Kitchen/Demand Analytics, Complaints/Escalation, and Audit Logging
-- ============================================================================

-- ============================================================================
-- NORMALIZATION NOTES (3NF COMPLIANCE):
-- 1. 1NF (First Normal Form):
--    - Each table has a designated primary key (`<table>_id`).
--    - Every column contains atomic (indivisible) values. No repeating groups or comma-separated lists.
--    - `audit_logs` stores change payloads using structured JSON for historical audit fidelity.
--
-- 2. 2NF (Second Normal Form):
--    - Every table is in 1NF.
--    - All non-key attributes are fully functionally dependent on the entire primary key.
--    - Single-column synthetic primary keys (`sales_history_id`, `complaint_id`, etc.) ensure no partial dependencies exist.
--
-- 3. 3NF (Third Normal Form):
--    - Every table is in 2NF.
--    - There are no transitive dependencies (non-prime attribute -> non-prime attribute).
--    - `sales_history` contains pre-aggregated daily summaries strictly populated via stored procedure
--      from operational facts (`order_items`, `food_batches`) to prevent real-time analytical locking on OLTP tables.
--    - `complaints` separates incident records from workflow actions (`complaint_actions`), avoiding repeating groups
--      and preventing multi-valued update anomalies.
--    - `complaint_keywords` isolates keyword classification rules from the complaint instances.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS complaint_actions;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS complaint_keywords;
DROP TABLE IF EXISTS sales_history;

-- ----------------------------------------------------------------------------
-- Table 1: sales_history
-- Historical aggregated analytical facts per menu item per day.
-- Populated strictly via `refresh_sales_history` stored procedure.
-- ----------------------------------------------------------------------------
CREATE TABLE sales_history (
    sales_history_id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    sale_date DATE NOT NULL,
    weekday VARCHAR(10) NOT NULL,
    qty_sold INT NOT NULL DEFAULT 0,
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    qty_cooked INT NOT NULL DEFAULT 0,
    qty_leftover INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_history_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(menu_item_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT uq_sales_history_item_date
        UNIQUE (menu_item_id, sale_date),
    CONSTRAINT chk_sales_qty_sold
        CHECK (qty_sold >= 0),
    CONSTRAINT chk_sales_revenue
        CHECK (revenue >= 0.00),
    CONSTRAINT chk_sales_qty_cooked
        CHECK (qty_cooked >= 0),
    CONSTRAINT chk_sales_qty_leftover
        CHECK (qty_leftover >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 2: complaint_keywords
-- Keyword dictionary for deterministic rule-based NLP classification
-- ----------------------------------------------------------------------------
CREATE TABLE complaint_keywords (
    complaint_keyword_id INT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(50) NOT NULL,
    category ENUM('hygiene', 'food_quality', 'foreign_object', 'service', 'other') NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_complaint_keyword UNIQUE (keyword)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 3: complaints
-- Core ticketing table for student grievances and food quality escalations
-- ----------------------------------------------------------------------------
CREATE TABLE complaints (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    menu_item_id INT NULL,
    description TEXT NOT NULL,
    proof_image LONGTEXT NULL,
    category ENUM('hygiene', 'food_quality', 'foreign_object', 'service', 'other') NOT NULL DEFAULT 'other',
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'escalated', 'closed') NOT NULL DEFAULT 'open',
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolution_deadline TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    escalated_at TIMESTAMP NULL,
    escalation_level INT NOT NULL DEFAULT 0,

    CONSTRAINT fk_complaints_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaints_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(menu_item_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaints_assigned
        FOREIGN KEY (assigned_to)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT chk_escalation_level
        CHECK (escalation_level >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 4: complaint_actions
-- Audit trail and lifecycle history for each complaint
-- ----------------------------------------------------------------------------
CREATE TABLE complaint_actions (
    complaint_action_id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    action_by INT NULL,
    action_type ENUM('note', 'assigned', 'status_change', 'escalated', 'resolved') NOT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_complaint_actions_complaint
        FOREIGN KEY (complaint_id)
        REFERENCES complaints(complaint_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_complaint_actions_user
        FOREIGN KEY (action_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Table 5: audit_logs
-- System-wide change data capture log for accountability & viva demonstration
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    audit_log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_value JSON NULL,
    new_value JSON NULL,
    changed_by INT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (changed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- INDEXES
-- Index 1: Composite index on complaints (status, resolution_deadline)
-- Speeds up overdue detection query and admin status-filtered dashboards.
--
-- Index 2: Composite index on sales_history (menu_item_id, sale_date)
-- Speeds up date-range aggregation and weekday demand pattern lookups per dish.
-- ============================================================================

CREATE INDEX idx_complaints_status_deadline
    ON complaints(status, resolution_deadline);

CREATE INDEX idx_sales_history_item_date
    ON sales_history(menu_item_id, sale_date);

SET FOREIGN_KEY_CHECKS = 1;
