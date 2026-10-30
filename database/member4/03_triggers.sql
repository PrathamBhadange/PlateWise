-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 03_triggers.sql
-- Automated SLA Deadlines, Lifecycle Action Logging, and Audit Trails
-- ============================================================================

DELIMITER $$

-- ----------------------------------------------------------------------------
-- Trigger 1: trg_complaints_before_insert
-- Sets SLA resolution_deadline dynamically based on incident severity:
--   critical -> +2 hours
--   high     -> +4 hours
--   medium   -> +24 hours
--   low      -> +72 hours
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_complaints_before_insert$$
CREATE TRIGGER trg_complaints_before_insert
BEFORE INSERT ON complaints
FOR EACH ROW
BEGIN
    DECLARE base_time TIMESTAMP;
    SET base_time = COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
    
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = base_time;
    END IF;

    -- Automatically calculate resolution deadline if not explicitly provided
    IF NEW.resolution_deadline IS NULL THEN
        CASE NEW.severity
            WHEN 'critical' THEN
                SET NEW.resolution_deadline = DATE_ADD(base_time, INTERVAL 2 HOUR);
            WHEN 'high' THEN
                SET NEW.resolution_deadline = DATE_ADD(base_time, INTERVAL 4 HOUR);
            WHEN 'medium' THEN
                SET NEW.resolution_deadline = DATE_ADD(base_time, INTERVAL 24 HOUR);
            WHEN 'low' THEN
                SET NEW.resolution_deadline = DATE_ADD(base_time, INTERVAL 72 HOUR);
            ELSE
                SET NEW.resolution_deadline = DATE_ADD(base_time, INTERVAL 24 HOUR);
        END CASE;
    END IF;
END$$

-- ----------------------------------------------------------------------------
-- Trigger 2: trg_complaints_after_update
-- Emits action history in complaint_actions on lifecycle changes (status or assignment)
-- and logs immutable change data capture records in audit_logs.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_complaints_after_update$$
CREATE TRIGGER trg_complaints_after_update
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    DECLARE act_type VARCHAR(20);
    DECLARE act_remarks TEXT;
    DECLARE status_changed BOOLEAN;
    DECLARE assignment_changed BOOLEAN;

    SET status_changed = (OLD.status <> NEW.status);
    SET assignment_changed = (
        (OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL) OR
        (OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL) OR
        (OLD.assigned_to <> NEW.assigned_to)
    );

    -- 1. Lifecycle Tracking in complaint_actions
    IF status_changed OR assignment_changed THEN
        IF NEW.status = 'resolved' THEN
            SET act_type = 'resolved';
            SET act_remarks = CONCAT('Complaint marked as resolved. Previous status: ', OLD.status);
        ELSEIF NEW.status = 'escalated' THEN
            SET act_type = 'escalated';
            SET act_remarks = CONCAT('Escalated to level ', NEW.escalation_level, '. SLA deadline was ', OLD.resolution_deadline);
        ELSEIF status_changed THEN
            SET act_type = 'status_change';
            SET act_remarks = CONCAT('Status changed from ', OLD.status, ' to ', NEW.status);
        ELSE
            SET act_type = 'assigned';
            SET act_remarks = CONCAT('Reassigned to user ID: ', IFNULL(CAST(NEW.assigned_to AS CHAR), 'Unassigned'));
        END IF;

        INSERT INTO complaint_actions (
            complaint_id,
            action_by,
            action_type,
            remarks,
            created_at
        ) VALUES (
            NEW.complaint_id,
            NEW.assigned_to,
            act_type,
            act_remarks,
            CURRENT_TIMESTAMP
        );
    END IF;

    -- 2. Change Data Capture in audit_logs
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
        NEW.complaint_id,
        'UPDATE',
        JSON_OBJECT(
            'status', OLD.status,
            'severity', OLD.severity,
            'assigned_to', OLD.assigned_to,
            'escalation_level', OLD.escalation_level,
            'resolution_deadline', OLD.resolution_deadline,
            'resolved_at', OLD.resolved_at
        ),
        JSON_OBJECT(
            'status', NEW.status,
            'severity', NEW.severity,
            'assigned_to', NEW.assigned_to,
            'escalation_level', NEW.escalation_level,
            'resolution_deadline', NEW.resolution_deadline,
            'resolved_at', NEW.resolved_at
        ),
        NEW.assigned_to,
        CURRENT_TIMESTAMP
    );
END$$

DELIMITER ;

