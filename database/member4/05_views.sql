-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 05_views.sql
-- Analytical Reporting Views Featuring Window Functions (DENSE_RANK, LAG, Moving AVG)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View 1: v_daily_sales
-- Daily revenue and food volume metrics with a 7-day rolling moving average of revenue
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT 
    sh.sale_date,
    sh.weekday,
    SUM(sh.qty_sold) AS total_sold,
    SUM(sh.qty_cooked) AS total_cooked,
    SUM(sh.qty_leftover) AS total_leftover,
    SUM(sh.revenue) AS total_revenue,
    ROUND(
        CASE 
            WHEN SUM(sh.qty_cooked) > 0 THEN 
                (SUM(sh.qty_leftover) * 100.0) / SUM(sh.qty_cooked)
            ELSE 0.0 
        END, 
        1
    ) AS waste_percentage,
    ROUND(
        AVG(SUM(sh.revenue)) OVER (
            ORDER BY sh.sale_date 
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ),
        2
    ) AS moving_avg_7d_revenue
FROM sales_history sh
GROUP BY sh.sale_date, sh.weekday;

-- ----------------------------------------------------------------------------
-- View 2: v_top_selling_items
-- Performance ranking of canteen items by total portions sold and revenue
-- Utilizes DENSE_RANK() window function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_top_selling_items AS
SELECT 
    m.menu_item_id,
    m.name AS item_name,
    m.category,
    m.price,
    COALESCE(SUM(sh.qty_sold), 0) AS total_sold,
    COALESCE(SUM(sh.revenue), 0.00) AS total_revenue,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(sh.qty_sold), 0) DESC) AS sales_rank
FROM menu_items m
LEFT JOIN sales_history sh ON m.menu_item_id = sh.menu_item_id
GROUP BY m.menu_item_id, m.name, m.category, m.price;

-- ----------------------------------------------------------------------------
-- View 3: v_most_wasted_items
-- Food waste tracking ranking dishes by leftover portions and waste ratio
-- Utilizes RANK() window function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_most_wasted_items AS
SELECT 
    m.menu_item_id,
    m.name AS item_name,
    m.category,
    COALESCE(SUM(sh.qty_cooked), 0) AS total_cooked,
    COALESCE(SUM(sh.qty_leftover), 0) AS total_leftover,
    ROUND(
        CASE 
            WHEN SUM(sh.qty_cooked) > 0 THEN 
                (SUM(sh.qty_leftover) * 100.0) / SUM(sh.qty_cooked)
            ELSE 0.0 
        END, 
        1
    ) AS waste_percentage,
    RANK() OVER (ORDER BY COALESCE(SUM(sh.qty_leftover), 0) DESC) AS waste_rank
FROM menu_items m
LEFT JOIN sales_history sh ON m.menu_item_id = sh.menu_item_id
GROUP BY m.menu_item_id, m.name, m.category;

-- ----------------------------------------------------------------------------
-- View 4: v_demand_weekday_avg
-- Multi-week weekday sales patterns per dish with partitioned ranking
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_demand_weekday_avg AS
SELECT 
    m.menu_item_id,
    m.name AS item_name,
    sh.weekday,
    ROUND(AVG(sh.qty_sold), 1) AS avg_qty_sold,
    ROUND(AVG(sh.qty_leftover), 1) AS avg_qty_leftover,
    RANK() OVER (
        PARTITION BY sh.weekday 
        ORDER BY AVG(sh.qty_sold) DESC
    ) AS weekday_rank
FROM menu_items m
JOIN sales_history sh ON m.menu_item_id = sh.menu_item_id
GROUP BY m.menu_item_id, m.name, sh.weekday;

-- ----------------------------------------------------------------------------
-- View 5: v_complaint_dashboard
-- High-level grievance KPI aggregates for operational monitoring
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_complaint_dashboard AS
SELECT 
    COUNT(*) AS total_complaints,
    COUNT(CASE WHEN status = 'open' THEN 1 END) AS open_count,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress_count,
    COUNT(CASE WHEN status = 'escalated' THEN 1 END) AS escalated_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved_count,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closed_count,
    COUNT(CASE WHEN status NOT IN ('resolved', 'closed') AND resolution_deadline < CURRENT_TIMESTAMP THEN 1 END) AS overdue_count,
    ROUND(
        AVG(CASE 
            WHEN resolved_at IS NOT NULL THEN 
                TIMESTAMPDIFF(MINUTE, created_at, resolved_at) / 60.0 
        END), 
        1
    ) AS avg_resolution_hours
FROM complaints;

-- ----------------------------------------------------------------------------
-- View 6: v_overdue_complaints
-- Detailed actionable view of tickets breaching resolution SLAs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_overdue_complaints AS
SELECT 
    c.complaint_id,
    c.user_id,
    u.full_name AS student_name,
    u.email AS student_email,
    c.menu_item_id,
    m.name AS menu_item_name,
    c.description,
    c.category,
    c.severity,
    c.status,
    c.escalation_level,
    c.created_at,
    c.resolution_deadline,
    ROUND(TIMESTAMPDIFF(MINUTE, c.resolution_deadline, CURRENT_TIMESTAMP) / 60.0, 1) AS hours_overdue,
    c.assigned_to,
    staff.full_name AS assigned_to_name
FROM complaints c
JOIN users u ON c.user_id = u.user_id
LEFT JOIN menu_items m ON c.menu_item_id = m.menu_item_id
LEFT JOIN users staff ON c.assigned_to = staff.user_id
WHERE c.status NOT IN ('resolved', 'closed')
  AND c.resolution_deadline < CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- View 7: v_impact_summary
-- Campus environmental impact indicators: portions rescued, donated, and wasted
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_impact_summary AS
WITH sales_totals AS (
    SELECT 
        COALESCE(SUM(qty_sold), 0) AS total_sold,
        COALESCE(SUM(qty_leftover), 0) AS total_leftover,
        COALESCE(SUM(revenue), 0.00) AS total_revenue
    FROM sales_history
),
donation_totals AS (
    SELECT COALESCE(SUM(quantity), 0) AS total_donated
    FROM donations
),
waste_totals AS (
    SELECT COALESCE(SUM(quantity), 0) AS total_waste_logged
    FROM waste_logs
)
SELECT 
    s.total_sold AS portions_sold,
    d.total_donated AS portions_donated,
    GREATEST(s.total_leftover, w.total_waste_logged) AS portions_wasted,
    (s.total_sold + d.total_donated) AS total_saved_portions,
    ROUND(
        (GREATEST(s.total_leftover, w.total_waste_logged) * 100.0) / 
        NULLIF((s.total_sold + d.total_donated + GREATEST(s.total_leftover, w.total_waste_logged)), 0),
        1
    ) AS waste_percentage,
    s.total_revenue
FROM sales_totals s
CROSS JOIN donation_totals d
CROSS JOIN waste_totals w;

-- ----------------------------------------------------------------------------
-- View 8: v_monthly_trend
-- Month-over-Month trend featuring LAG() window function to calculate MoM revenue growth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_monthly_trend AS
WITH monthly_agg AS (
    SELECT 
        DATE_FORMAT(sale_date, '%Y-%m') AS sale_month,
        SUM(qty_sold) AS monthly_sold,
        SUM(qty_cooked) AS monthly_cooked,
        SUM(qty_leftover) AS monthly_leftover,
        SUM(revenue) AS monthly_revenue
    FROM sales_history
    GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
)
SELECT 
    m.sale_month,
    m.monthly_sold,
    m.monthly_cooked,
    m.monthly_leftover,
    m.monthly_revenue,
    LAG(m.monthly_revenue, 1) OVER (ORDER BY m.sale_month) AS prev_month_revenue,
    ROUND(
        CASE 
            WHEN LAG(m.monthly_revenue, 1) OVER (ORDER BY m.sale_month) > 0 THEN 
                ((m.monthly_revenue - LAG(m.monthly_revenue, 1) OVER (ORDER BY m.sale_month)) * 100.0) / 
                LAG(m.monthly_revenue, 1) OVER (ORDER BY m.sale_month)
            ELSE 0.0 
        END, 
        2
    ) AS mom_growth_pct,
    ROUND(
        CASE 
            WHEN m.monthly_cooked > 0 THEN 
                (m.monthly_leftover * 100.0) / m.monthly_cooked
            ELSE 0.0 
        END, 
        1
    ) AS monthly_waste_pct
FROM monthly_agg m;

