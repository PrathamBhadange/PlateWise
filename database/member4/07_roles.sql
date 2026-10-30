-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 07_roles.sql
-- Role-Based Access Control (RBAC) Security Grants
-- Strictly grants privileges for Member 4 schema objects
-- ============================================================================

-- Create roles if not already present in the MySQL instance
CREATE ROLE IF NOT EXISTS 'kitchen_role';
CREATE ROLE IF NOT EXISTS 'admin_role';
CREATE ROLE IF NOT EXISTS 'student_role';

-- ----------------------------------------------------------------------------
-- 1. Kitchen Role:
-- Needs access to kitchen dashboards, sales views, and demand forecasting
-- ----------------------------------------------------------------------------
GRANT SELECT ON v_daily_sales TO 'kitchen_role';
GRANT SELECT ON v_top_selling_items TO 'kitchen_role';
GRANT SELECT ON v_most_wasted_items TO 'kitchen_role';
GRANT SELECT ON v_demand_weekday_avg TO 'kitchen_role';
GRANT EXECUTE ON PROCEDURE get_demand_recommendation TO 'kitchen_role';
GRANT EXECUTE ON PROCEDURE daily_sales_summary TO 'kitchen_role';

-- ----------------------------------------------------------------------------
-- 2. Admin Role:
-- Full administrative governance over all Member 4 tables, views, procedures, and audits
-- ----------------------------------------------------------------------------
GRANT ALL PRIVILEGES ON complaints TO 'admin_role';
GRANT ALL PRIVILEGES ON complaint_actions TO 'admin_role';
GRANT ALL PRIVILEGES ON complaint_keywords TO 'admin_role';
GRANT ALL PRIVILEGES ON sales_history TO 'admin_role';
GRANT SELECT, INSERT ON audit_logs TO 'admin_role';

GRANT SELECT ON v_daily_sales TO 'admin_role';
GRANT SELECT ON v_top_selling_items TO 'admin_role';
GRANT SELECT ON v_most_wasted_items TO 'admin_role';
GRANT SELECT ON v_demand_weekday_avg TO 'admin_role';
GRANT SELECT ON v_complaint_dashboard TO 'admin_role';
GRANT SELECT ON v_overdue_complaints TO 'admin_role';
GRANT SELECT ON v_impact_summary TO 'admin_role';
GRANT SELECT ON v_monthly_trend TO 'admin_role';

GRANT EXECUTE ON PROCEDURE classify_complaint TO 'admin_role';
GRANT EXECUTE ON PROCEDURE submit_complaint TO 'admin_role';
GRANT EXECUTE ON PROCEDURE escalate_overdue_complaints TO 'admin_role';
GRANT EXECUTE ON PROCEDURE refresh_sales_history TO 'admin_role';
GRANT EXECUTE ON PROCEDURE get_demand_recommendation TO 'admin_role';
GRANT EXECUTE ON PROCEDURE daily_sales_summary TO 'admin_role';

-- ----------------------------------------------------------------------------
-- 3. Student Role:
-- Least privilege: can only submit complaints and view active menu items
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON PROCEDURE submit_complaint TO 'student_role';
GRANT SELECT (menu_item_id, name, category, price) ON menu_items TO 'student_role';

-- Optional: Flush privileges to ensure role updates take effect
FLUSH PRIVILEGES;

