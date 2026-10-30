-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 04_procedures.sql
-- Rule-Based NLP Classifier, Transactional Submissions, Idempotent Escalations,
-- Demand Forecasting Engine, and Sales Aggregations
-- ============================================================================

DELIMITER $$

-- ----------------------------------------------------------------------------
-- Procedure 1: classify_complaint
-- Rule-based NLP classifier matching grievance descriptions against `complaint_keywords`.
-- Returns category and severity based on keyword severity hierarchy:
-- critical > high > medium > low. Defaults to 'other' / 'medium'.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS classify_complaint$$
CREATE PROCEDURE classify_complaint (
    IN p_description TEXT,
    OUT p_category VARCHAR(30),
    OUT p_severity VARCHAR(20)
)
BEGIN
    DECLARE found_category VARCHAR(30) DEFAULT NULL;
    DECLARE found_severity VARCHAR(20) DEFAULT NULL;

    -- Match against keyword rulebook with severity ordering
    SELECT category, severity
    INTO found_category, found_severity
    FROM complaint_keywords
    WHERE LOWER(p_description) REGEXP CONCAT('[[:<:]]', LOWER(keyword), '[[:>:]]')
       OR LOWER(p_description) LIKE CONCAT('%', LOWER(keyword), '%')
    ORDER BY 
        CASE severity
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 1
            ELSE 0
        END DESC,
        LENGTH(keyword) DESC
    LIMIT 1;

    -- Fallback to default category/severity if no keyword is matched
    SET p_category = COALESCE(found_category, 'other');
    SET p_severity = COALESCE(found_severity, 'medium');
END$$

-- ----------------------------------------------------------------------------
-- Procedure 2: submit_complaint
-- Transactional complaint intake: classifies text, creates ticket, logs initial
-- lifecycle action and immutable audit log entry atomically.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS submit_complaint$$
CREATE PROCEDURE submit_complaint (
    IN p_user_id INT,
    IN p_menu_item_id INT,
    IN p_description TEXT,
    OUT p_complaint_id INT,
    OUT p_category VARCHAR(30),
    OUT p_severity VARCHAR(20)
)
proc_label: BEGIN
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_menu_exists INT DEFAULT 0;

    -- Transaction rollback handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- 1. Validation checks
    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Validation Error: Complaint description cannot be empty';
    END IF;

    SELECT COUNT(*) INTO v_user_exists FROM users WHERE user_id = p_user_id;
    IF v_user_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Validation Error: User does not exist';
    END IF;

    IF p_menu_item_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_menu_exists FROM menu_items WHERE menu_item_id = p_menu_item_id;
        IF v_menu_exists = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Validation Error: Specified menu item does not exist';
        END IF;
    END IF;

    START TRANSACTION;

    -- 2. Automated classification
    CALL classify_complaint(p_description, p_category, p_severity);

    -- 3. Insert complaint record (Triggers will auto-populate resolution_deadline)
    INSERT INTO complaints (
        user_id,
        menu_item_id,
        description,
        category,
        severity,
        status,
        created_at
    ) VALUES (
        p_user_id,
        p_menu_item_id,
        p_description,
        p_category,
        p_severity,
        'open',
        CURRENT_TIMESTAMP
    );

    SET p_complaint_id = LAST_INSERT_ID();

    -- 4. Initial action in complaint_actions
    INSERT INTO complaint_actions (
        complaint_id,
        action_by,
        action_type,
        remarks,
        created_at
    ) VALUES (
        p_complaint_id,
        p_user_id,
        'note',
        CONCAT('Ticket submitted and auto-classified as [', p_category, ' / ', p_severity, ']'),
        CURRENT_TIMESTAMP
    );

    -- 5. Audit log record
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_value,
        new_value,
        changed_by,
        changed_at
    ) VALUES (
        'complaints',
        p_complaint_id,
        'INSERT',
        NULL,
        JSON_OBJECT(
            'complaint_id', p_complaint_id,
            'user_id', p_user_id,
            'menu_item_id', p_menu_item_id,
            'category', p_category,
            'severity', p_severity,
            'status', 'open'
        ),
        p_user_id,
        CURRENT_TIMESTAMP
    );

    COMMIT;
END$$

-- ----------------------------------------------------------------------------
-- Procedure 3: escalate_overdue_complaints
-- Idempotent escalation engine: detects unresolved complaints past resolution_deadline,
-- bumps escalation_level, sets status='escalated', and prevents double-escalation
-- within a 2-hour window.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS escalate_overdue_complaints$$
CREATE PROCEDURE escalate_overdue_complaints (
    OUT p_escalated_count INT
)
BEGIN
    -- Temporary isolation table for idempotent processing
    DROP TEMPORARY TABLE IF EXISTS tmp_overdue_complaints;
    CREATE TEMPORARY TABLE tmp_overdue_complaints (
        complaint_id INT PRIMARY KEY
    );

    -- Identify tickets eligible for escalation:
    -- 1) status is open/in_progress and deadline is past
    -- 2) or status is already escalated but overdue by another 2 hours without resolution
    INSERT INTO tmp_overdue_complaints (complaint_id)
    SELECT c.complaint_id
    FROM complaints c
    WHERE c.status NOT IN ('resolved', 'closed')
      AND c.resolution_deadline < CURRENT_TIMESTAMP
      AND (
          c.escalated_at IS NULL 
          OR c.escalated_at <= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 HOUR)
      );

    -- Perform idempotent atomic update
    UPDATE complaints c
    JOIN tmp_overdue_complaints t ON c.complaint_id = t.complaint_id
    SET c.status = 'escalated',
        c.escalation_level = c.escalation_level + 1,
        c.escalated_at = CURRENT_TIMESTAMP;

    SET p_escalated_count = ROW_COUNT();

    DROP TEMPORARY TABLE IF EXISTS tmp_overdue_complaints;
END$$

-- ----------------------------------------------------------------------------
-- Procedure 4: refresh_sales_history
-- Aggregates daily order_items and food_batches into sales_history facts.
-- Safe for re-running via ON DUPLICATE KEY UPDATE.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS refresh_sales_history$$
CREATE PROCEDURE refresh_sales_history (
    IN p_date DATE
)
BEGIN
    DECLARE v_weekday VARCHAR(10);
    SET v_weekday = DAYNAME(p_date);

    INSERT INTO sales_history (
        menu_item_id,
        sale_date,
        weekday,
        qty_sold,
        revenue,
        qty_cooked,
        qty_leftover
    )
    SELECT 
        m.menu_item_id,
        p_date AS sale_date,
        v_weekday AS weekday,
        COALESCE(orders_agg.total_sold, 0) AS qty_sold,
        COALESCE(orders_agg.total_revenue, 0.00) AS revenue,
        COALESCE(batch_agg.total_cooked, 0) AS qty_cooked,
        COALESCE(batch_agg.total_leftover, 0) AS qty_leftover
    FROM menu_items m
    LEFT JOIN (
        SELECT 
            oi.menu_item_id,
            SUM(oi.quantity) AS total_sold,
            SUM(oi.quantity * oi.unit_price) AS total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.pickup_date = p_date
          AND o.status <> 'cancelled'
        GROUP BY oi.menu_item_id
    ) orders_agg ON m.menu_item_id = orders_agg.menu_item_id
    LEFT JOIN (
        SELECT 
            fb.menu_item_id,
            SUM(fb.cooked_qty) AS total_cooked,
            SUM(fb.leftover_qty) AS total_leftover
        FROM food_batches fb
        WHERE fb.batch_date = p_date
        GROUP BY fb.menu_item_id
    ) batch_agg ON m.menu_item_id = batch_agg.menu_item_id
    WHERE orders_agg.total_sold IS NOT NULL OR batch_agg.total_cooked IS NOT NULL
    ON DUPLICATE KEY UPDATE
        qty_sold = VALUES(qty_sold),
        revenue = VALUES(revenue),
        qty_cooked = VALUES(qty_cooked),
        qty_leftover = VALUES(qty_leftover);
END$$

-- ----------------------------------------------------------------------------
-- Procedure 5: get_demand_recommendation
-- Calculates recommended cook quantity for target_date per dish based on:
-- 1. Average qty_sold on the matching weekday over the previous 4 weeks.
-- 2. Pre-orders placed for target_date.
-- 3. Waste penalty: If historical leftover exceeds 15%, scales back cook estimate.
-- 4. Dynamic confidence level based on sample points (HIGH >=4, MED 2-3, LOW 1, VERY_LOW 0).
-- Guarded against divide-by-zero on empty histories.
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS get_demand_recommendation$$
CREATE PROCEDURE get_demand_recommendation (
    IN p_target_date DATE
)
BEGIN
    DECLARE v_weekday VARCHAR(10);
    SET v_weekday = DAYNAME(p_target_date);

    SELECT 
        m.menu_item_id,
        m.name AS item_name,
        m.category,
        m.price,
        v_weekday AS target_weekday,
        COALESCE(hist.data_points, 0) AS data_points,
        ROUND(COALESCE(hist.avg_sold, 0), 1) AS weekday_avg_sold,
        ROUND(COALESCE(hist.leftover_percentage, 0), 1) AS historical_waste_pct,
        COALESCE(pre.pre_order_qty, 0) AS pre_orders,
        
        -- Recommendation Formula:
        -- If no history, default to pre_orders + safe baseline
        -- If leftover > 15%, scale recommendation by reduction factor (1 - (waste - 15%))
        CAST(
            CASE 
                WHEN COALESCE(hist.data_points, 0) = 0 THEN
                    GREATEST(COALESCE(pre.pre_order_qty, 0), 15)
                ELSE
                    GREATEST(
                        COALESCE(pre.pre_order_qty, 0),
                        ROUND(
                            (hist.avg_sold * 
                                CASE 
                                    WHEN hist.leftover_percentage > 15.0 THEN 
                                        GREATEST(0.50, 1.0 - ((hist.leftover_percentage - 15.0) / 100.0))
                                    ELSE 1.0 
                                END
                            ) + (COALESCE(pre.pre_order_qty, 0) * 0.25)
                        )
                    )
            END AS SIGNED
        ) AS recommended_qty,

        -- Confidence Rating
        CASE 
            WHEN COALESCE(hist.data_points, 0) >= 4 THEN 'HIGH'
            WHEN COALESCE(hist.data_points, 0) >= 2 THEN 'MEDIUM'
            WHEN COALESCE(hist.data_points, 0) = 1 THEN 'LOW'
            ELSE 'VERY_LOW'
        END AS confidence_level

    FROM menu_items m
    -- Historical 4-week weekday window
    LEFT JOIN (
        SELECT 
            sh.menu_item_id,
            COUNT(sh.sales_history_id) AS data_points,
            AVG(sh.qty_sold) AS avg_sold,
            CASE 
                WHEN SUM(sh.qty_cooked) > 0 THEN 
                    (SUM(sh.qty_leftover) * 100.0) / SUM(sh.qty_cooked)
                ELSE 0.0 
            END AS leftover_percentage
        FROM sales_history sh
        WHERE sh.weekday = v_weekday
          AND sh.sale_date >= DATE_SUB(p_target_date, INTERVAL 28 DAY)
          AND sh.sale_date < p_target_date
        GROUP BY sh.menu_item_id
    ) hist ON m.menu_item_id = hist.menu_item_id
    -- Confirmed pre-orders placed for the target date
    LEFT JOIN (
        SELECT 
            oi.menu_item_id,
            SUM(oi.quantity) AS pre_order_qty
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.pickup_date = p_target_date
          AND o.status <> 'cancelled'
        GROUP BY oi.menu_item_id
    ) pre ON m.menu_item_id = pre.menu_item_id
    ORDER BY m.category, m.name;
END$$

-- ----------------------------------------------------------------------------
-- Procedure 6: daily_sales_summary
-- Summarizes sales, kitchen production, revenue, and waste stats for a target date
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS daily_sales_summary$$
CREATE PROCEDURE daily_sales_summary (
    IN p_date DATE
)
BEGIN
    SELECT 
        p_date AS report_date,
        DAYNAME(p_date) AS weekday,
        COALESCE(SUM(sh.qty_sold), 0) AS total_portions_sold,
        COALESCE(SUM(sh.qty_cooked), 0) AS total_portions_cooked,
        COALESCE(SUM(sh.qty_leftover), 0) AS total_portions_leftover,
        COALESCE(SUM(sh.revenue), 0.00) AS total_revenue,
        ROUND(
            CASE 
                WHEN SUM(sh.qty_cooked) > 0 THEN 
                    (SUM(sh.qty_leftover) * 100.0) / SUM(sh.qty_cooked)
                ELSE 0.0 
            END, 
            1
        ) AS waste_percentage,
        COUNT(DISTINCT sh.menu_item_id) AS items_sold_count
    FROM sales_history sh
    WHERE sh.sale_date = p_date;
END$$

DELIMITER ;

-- ============================================================================
-- Scheduled Background Event: evt_escalate_overdue
-- Evaluates complaint tickets every 5 minutes and executes automated escalation
-- ============================================================================
DROP EVENT IF EXISTS evt_escalate_overdue;
CREATE EVENT evt_escalate_overdue
ON SCHEDULE EVERY 5 MINUTE
DO
    CALL escalate_overdue_complaints(@discard_escalated_count);

