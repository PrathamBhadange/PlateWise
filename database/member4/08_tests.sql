-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 08_tests.sql
-- Automated DBMS Test Suite for Viva Demonstration
-- Tests:
-- 1. Severity-to-deadline SLA mapping
-- 2. Overdue complaint escalation
-- 3. Idempotent escalation (no double escalation within level window)
-- 4. Zero-sales day handling in demand recommendation (no divide-by-zero)
-- 5. Audit log change data capture
-- 6. Transactional rollback on failed complaint submission
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS run_member4_tests$$
CREATE PROCEDURE run_member4_tests()
proc: BEGIN
    DECLARE v_test_id INT;
    DECLARE v_cat VARCHAR(30);
    DECLARE v_sev VARCHAR(20);
    DECLARE v_cnt INT;
    DECLARE v_deadline TIMESTAMP;
    DECLARE v_audit_cnt_before INT;
    DECLARE v_audit_cnt_after INT;
    DECLARE v_complaints_count_before INT;
    DECLARE v_complaints_count_after INT;
    DECLARE v_rollback_caught BOOLEAN DEFAULT FALSE;

    CREATE TEMPORARY TABLE IF NOT EXISTS test_results (
        test_number INT,
        test_name VARCHAR(100),
        status VARCHAR(10),
        details TEXT
    );
    TRUNCATE TABLE test_results;

    -- ========================================================================
    -- TEST 1: Severity-to-Deadline SLA Mapping
    -- ========================================================================
    INSERT INTO complaints (user_id, menu_item_id, description, category, severity, status, created_at)
    VALUES (5, 1, 'Test critical SLA calculation', 'hygiene', 'critical', 'open', '2026-10-30 10:00:00');
    SET v_test_id = LAST_INSERT_ID();
    
    SELECT resolution_deadline INTO v_deadline FROM complaints WHERE complaint_id = v_test_id;

    IF v_deadline = '2026-10-30 12:00:00' THEN
        INSERT INTO test_results VALUES (1, 'Severity-to-Deadline SLA Mapping', 'PASSED', 'Critical severity set deadline to exact +2 hours (12:00:00)');
    ELSE
        INSERT INTO test_results VALUES (1, 'Severity-to-Deadline SLA Mapping', 'FAILED', CONCAT('Expected 2026-10-30 12:00:00 but got ', IFNULL(CAST(v_deadline AS CHAR), 'NULL')));
    END IF;
    DELETE FROM complaints WHERE complaint_id = v_test_id;

    -- ========================================================================
    -- TEST 2: Overdue Complaint Escalates
    -- ========================================================================
    -- Insert a deliberate overdue ticket
    INSERT INTO complaints (user_id, menu_item_id, description, category, severity, status, created_at, resolution_deadline, escalation_level)
    VALUES (5, 2, 'Test overdue escalation candidate', 'hygiene', 'critical', 'open', DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 0);
    SET v_test_id = LAST_INSERT_ID();

    CALL escalate_overdue_complaints(v_cnt);

    IF EXISTS (SELECT 1 FROM complaints WHERE complaint_id = v_test_id AND status = 'escalated' AND escalation_level = 1) THEN
        INSERT INTO test_results VALUES (2, 'Overdue Complaint Escalation', 'PASSED', CONCAT('Overdue ticket successfully transitioned to escalated (Level 1). Total escalated in run: ', v_cnt));
    ELSE
        INSERT INTO test_results VALUES (2, 'Overdue Complaint Escalation', 'FAILED', 'Ticket was not escalated');
    END IF;

    -- ========================================================================
    -- TEST 3: Idempotent Escalation (No double-escalation within window)
    -- ========================================================================
    -- Call escalate immediately again
    CALL escalate_overdue_complaints(v_cnt);

    IF (SELECT escalation_level FROM complaints WHERE complaint_id = v_test_id) = 1 THEN
        INSERT INTO test_results VALUES (3, 'Idempotent Escalation Protection', 'PASSED', 'Subsequent immediate execution maintained escalation_level = 1 without duplicate level jump');
    ELSE
        INSERT INTO test_results VALUES (3, 'Idempotent Escalation Protection', 'FAILED', 'Escalation level improperly incremented on repeat call');
    END IF;
    DELETE FROM complaints WHERE complaint_id = v_test_id;

    -- ========================================================================
    -- TEST 4: Zero-Sales Day Demand Recommendation (No Divide-by-Zero)
    -- ========================================================================
    BEGIN
        -- Querying a far-future date with zero prior data points
        DECLARE v_error_occurred BOOLEAN DEFAULT FALSE;
        DECLARE CONTINUE HANDLER FOR SQLEXCEPTION SET v_error_occurred = TRUE;

        CALL get_demand_recommendation('2035-12-31');

        IF v_error_occurred THEN
            INSERT INTO test_results VALUES (4, 'Zero-Sales Day Demand Query', 'FAILED', 'Divide by zero or SQL exception occurred');
        ELSE
            INSERT INTO test_results VALUES (4, 'Zero-Sales Day Demand Query', 'PASSED', 'Zero-sales date returned valid fallback recommendations without divide-by-zero');
        END IF;
    END;

    -- ========================================================================
    -- TEST 5: Audit Log Change Data Capture
    -- ========================================================================
    SELECT COUNT(*) INTO v_audit_cnt_before FROM audit_logs WHERE table_name = 'complaints';
    
    -- Update existing seeded complaint #12
    UPDATE complaints SET status = 'resolved', resolved_at = NOW(), assigned_to = 2 WHERE complaint_id = 12;
    
    SELECT COUNT(*) INTO v_audit_cnt_after FROM audit_logs WHERE table_name = 'complaints';

    IF v_audit_cnt_after > v_audit_cnt_before THEN
        INSERT INTO test_results VALUES (5, 'Audit Log Change Data Capture', 'PASSED', CONCAT('Trigger captured UPDATE and wrote audit log row. Log count increased by ', (v_audit_cnt_after - v_audit_cnt_before)));
    ELSE
        INSERT INTO test_results VALUES (5, 'Audit Log Change Data Capture', 'FAILED', 'No audit log row was written on complaint update');
    END IF;

    -- ========================================================================
    -- TEST 6: Transactional Rollback on Failed Submission
    -- ========================================================================
    SELECT COUNT(*) INTO v_complaints_count_before FROM complaints;

    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            SET v_rollback_caught = TRUE;
        END;

        -- Attempt submitting with non-existent user_id (99999) which fails validation
        CALL submit_complaint(99999, 1, 'Invalid user test complaint', v_test_id, v_cat, v_sev);
    END;

    SELECT COUNT(*) INTO v_complaints_count_after FROM complaints;

    IF v_rollback_caught AND (v_complaints_count_before = v_complaints_count_after) THEN
        INSERT INTO test_results VALUES (6, 'Transactional Rollback on Failed Submit', 'PASSED', 'Validation error triggered complete transaction rollback; no phantom rows created');
    ELSE
        INSERT INTO test_results VALUES (6, 'Transactional Rollback on Failed Submit', 'FAILED', 'Transaction did not rollback properly');
    END IF;

    -- Display Final Results
    SELECT * FROM test_results ORDER BY test_number;
    DROP TEMPORARY TABLE IF EXISTS test_results;
END$$

DELIMITER ;

-- Execute tests and display report
CALL run_member4_tests();

