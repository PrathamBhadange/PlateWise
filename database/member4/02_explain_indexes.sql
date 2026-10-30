-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 02_explain_indexes.sql
-- EXPLAIN benchmarks before and after creating indexes
-- ============================================================================

-- Query 1: Overdue Escalation Scan
EXPLAIN 
SELECT complaint_id, user_id, category, severity, status, resolution_deadline, escalation_level
FROM complaints
WHERE status IN ('open', 'in_progress')
  AND resolution_deadline < NOW();

-- Query 2: Weekday Demand Aggregation Scan
EXPLAIN 
SELECT menu_item_id, weekday, AVG(qty_sold) AS avg_sold, AVG(qty_leftover) AS avg_leftover
FROM sales_history
WHERE menu_item_id = 3
  AND weekday = 'Monday'
  AND sale_date >= DATE_SUB('2026-10-30', INTERVAL 28 DAY)
GROUP BY menu_item_id, weekday;

