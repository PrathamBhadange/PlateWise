-- ============================================================================
-- PlateWise - Member 4 Database Artifacts
-- 06_seed.sql
-- Deterministic, Idempotent Seed Data for Demo & Viva Defense
-- Includes 12 Indian Canteen Dishes, 6 Weeks of Sales & Wastage Facts,
-- ~40 Grievance Tickets across all Statuses (with Overdue Breaches), and 30 Donations.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;
TRUNCATE TABLE complaint_actions;
TRUNCATE TABLE complaints;
TRUNCATE TABLE complaint_keywords;
TRUNCATE TABLE sales_history;
TRUNCATE TABLE waste_logs;
TRUNCATE TABLE donations;
TRUNCATE TABLE food_batches;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE menu_items;
TRUNCATE TABLE users;

-- ----------------------------------------------------------------------------
-- 1. Users (Campus personas)
-- ----------------------------------------------------------------------------
INSERT INTO users (user_id, full_name, email, role) VALUES
(1, 'Dr. Ramesh Sharma', 'admin@platewise.campus', 'admin'),
(2, 'Chef Suresh Kumar', 'kitchen@platewise.campus', 'kitchen'),
(3, 'Ganesh Cook', 'ganesh@platewise.campus', 'kitchen'),
(4, 'Pooja Patil', 'cashier@platewise.campus', 'cashier'),
(5, 'Aarav Sharma', 'aarav.sharma@campus.edu', 'student'),
(6, 'Ananya Verma', 'ananya.verma@campus.edu', 'student'),
(7, 'Rohan Mehta', 'rohan.mehta@campus.edu', 'student'),
(8, 'Sneha Iyer', 'sneha.iyer@campus.edu', 'student'),
(9, 'Vikram Patel', 'vikram.patel@campus.edu', 'student'),
(10, 'Priya Nair', 'priya.nair@campus.edu', 'student'),
(11, 'Aditya Joshi', 'aditya.joshi@campus.edu', 'student'),
(12, 'Ishita Gupta', 'ishita.gupta@campus.edu', 'student'),
(13, 'Rahul Rao', 'rahul.rao@campus.edu', 'student'),
(14, 'Tanvi Deshmukh', 'tanvi.deshmukh@campus.edu', 'student'),
(15, 'Arjun Sen', 'arjun.sen@campus.edu', 'student');

-- ----------------------------------------------------------------------------
-- 2. Menu Items (12 Classic Indian College Canteen Dishes)
-- ----------------------------------------------------------------------------
INSERT INTO menu_items (menu_item_id, name, category, price) VALUES
(1, 'Kanda Poha', 'Breakfast', 25.00),
(2, 'Crispy Samosa (2 pcs)', 'Snacks', 20.00),
(3, 'Special Veg Thali', 'Lunch', 85.00),
(4, 'Masala Dosa', 'Breakfast', 50.00),
(5, 'Mumbai Pav Bhaji', 'Snacks', 65.00),
(6, 'Amritsari Chole Bhature', 'Lunch', 75.00),
(7, 'Idli Vada Combo', 'Breakfast', 40.00),
(8, 'Paneer Kathi Roll', 'Snacks', 55.00),
(9, 'Hyderabadi Veg Biryani', 'Lunch', 90.00),
(10, 'Rava Upma', 'Breakfast', 25.00),
(11, 'Special Masala Chai', 'Beverages', 12.00),
(12, 'South Indian Filter Coffee', 'Beverages', 18.00);

-- ----------------------------------------------------------------------------
-- 3. Complaint Keywords (NLP Classifier Rulebook)
-- ----------------------------------------------------------------------------
INSERT INTO complaint_keywords (keyword, category, severity) VALUES
-- Hygiene (Critical / High / Medium)
('cockroach', 'hygiene', 'critical'),
('lizard', 'hygiene', 'critical'),
('rat', 'hygiene', 'critical'),
('worm', 'hygiene', 'critical'),
('worms', 'hygiene', 'critical'),
('insect', 'hygiene', 'high'),
('fly', 'hygiene', 'high'),
('hair', 'hygiene', 'high'),
('dirty', 'hygiene', 'medium'),
('unhygienic', 'hygiene', 'medium'),
('washbasin', 'hygiene', 'low'),
-- Foreign Object (Critical / High / Medium)
('glass', 'foreign_object', 'critical'),
('nail', 'foreign_object', 'critical'),
('wire', 'foreign_object', 'high'),
('plastic', 'foreign_object', 'high'),
('stone', 'foreign_object', 'high'),
('pebble', 'foreign_object', 'medium'),
('thread', 'foreign_object', 'low'),
-- Food Quality (Critical / High / Medium / Low)
('expired', 'food_quality', 'critical'),
('poison', 'food_quality', 'critical'),
('spoiled', 'food_quality', 'high'),
('stale', 'food_quality', 'high'),
('smell', 'food_quality', 'high'),
('foul', 'food_quality', 'high'),
('sour', 'food_quality', 'medium'),
('raw', 'food_quality', 'medium'),
('undercooked', 'food_quality', 'medium'),
('cold', 'food_quality', 'low'),
('salty', 'food_quality', 'low'),
('burnt', 'food_quality', 'low'),
-- Service (Medium / Low)
('rude', 'service', 'medium'),
('overcharged', 'service', 'medium'),
('cheated', 'service', 'medium'),
('delayed', 'service', 'low'),
('slow', 'service', 'low'),
('queue', 'service', 'low');

-- ----------------------------------------------------------------------------
-- 4. 6 Weeks of Daily Sales History (Deterministic loop populating 504 rows)
-- ----------------------------------------------------------------------------
DELIMITER $$
DROP PROCEDURE IF EXISTS seed_sales_history_6weeks$$
CREATE PROCEDURE seed_sales_history_6weeks()
BEGIN
    DECLARE v_day_offset INT DEFAULT 42;
    DECLARE v_date DATE;
    DECLARE v_day_name VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_day_of_week INT;
    DECLARE v_base_mult DECIMAL(4,2);
    DECLARE v_item INT;
    DECLARE v_sold INT;
    DECLARE v_cooked INT;
    DECLARE v_leftover INT;
    DECLARE v_price DECIMAL(8,2);

    WHILE v_day_offset >= 1 DO
        SET v_date = DATE_SUB(CURRENT_DATE, INTERVAL v_day_offset DAY);
        SET v_day_name = CONVERT(DAYNAME(v_date) USING utf8mb4) COLLATE utf8mb4_unicode_ci;
        SET v_day_of_week = DAYOFWEEK(v_date); -- 1=Sun, 7=Sat

        -- Weekday multipliers (Campus rush Tue-Thu, weekend drop)
        CASE v_day_of_week
            WHEN 1 THEN SET v_base_mult = 0.35; -- Sunday
            WHEN 7 THEN SET v_base_mult = 0.50; -- Saturday
            WHEN 2 THEN SET v_base_mult = 1.05; -- Monday
            WHEN 3 THEN SET v_base_mult = 1.25; -- Tuesday
            WHEN 4 THEN SET v_base_mult = 1.30; -- Wednesday peak
            WHEN 5 THEN SET v_base_mult = 1.20; -- Thursday
            WHEN 6 THEN SET v_base_mult = 0.95; -- Friday
        END CASE;

        SET v_item = 1;
        WHILE v_item <= 12 DO
            SELECT price INTO v_price FROM menu_items WHERE menu_item_id = v_item;

            -- Base volume depending on category
            CASE v_item
                WHEN 1 THEN SET v_sold = ROUND(90 * v_base_mult + (v_day_offset % 7));   -- Poha
                WHEN 2 THEN SET v_sold = ROUND(160 * v_base_mult + (v_day_offset % 11)); -- Samosa
                WHEN 3 THEN SET v_sold = ROUND(110 * v_base_mult + (v_day_offset % 9));  -- Thali
                WHEN 4 THEN SET v_sold = ROUND(85 * v_base_mult + (v_day_offset % 5));   -- Dosa
                WHEN 5 THEN SET v_sold = ROUND(75 * v_base_mult + (v_day_offset % 8));   -- Pav Bhaji
                WHEN 6 THEN SET v_sold = ROUND(70 * v_base_mult + (v_day_offset % 6));   -- Chole Bhature
                WHEN 7 THEN SET v_sold = ROUND(65 * v_base_mult + (v_day_offset % 4));   -- Idli Vada
                WHEN 8 THEN SET v_sold = ROUND(80 * v_base_mult + (v_day_offset % 9));   -- Paneer Roll
                WHEN 9 THEN SET v_sold = ROUND(95 * v_base_mult + (v_day_offset % 10));  -- Biryani
                WHEN 10 THEN SET v_sold = ROUND(50 * v_base_mult + (v_day_offset % 6));  -- Upma
                WHEN 11 THEN SET v_sold = ROUND(220 * v_base_mult + (v_day_offset % 15));-- Chai
                WHEN 12 THEN SET v_sold = ROUND(140 * v_base_mult + (v_day_offset % 12));-- Coffee
            END CASE;

            -- Realistic leftover rate between 6% and 18%
            SET v_leftover = ROUND(v_sold * (0.06 + ((v_day_offset + v_item) % 12) * 0.01));
            SET v_cooked = v_sold + v_leftover;

            INSERT INTO sales_history (
                menu_item_id,
                sale_date,
                weekday,
                qty_sold,
                revenue,
                qty_cooked,
                qty_leftover
            ) VALUES (
                v_item,
                v_date,
                v_day_name,
                v_sold,
                v_sold * v_price,
                v_cooked,
                v_leftover
            );

            SET v_item = v_item + 1;
        END WHILE;

        SET v_day_offset = v_day_offset - 1;
    END WHILE;
END$$
DELIMITER ;

CALL seed_sales_history_6weeks();
DROP PROCEDURE IF EXISTS seed_sales_history_6weeks;

-- ----------------------------------------------------------------------------
-- 5. Food Batches, Donations, and Waste Logs (30 donations across recent batches)
-- ----------------------------------------------------------------------------
DELIMITER $$
DROP PROCEDURE IF EXISTS seed_donations_and_waste$$
CREATE PROCEDURE seed_donations_and_waste()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE v_batch_id INT;
    DECLARE v_date DATE;
    DECLARE v_item INT;
    DECLARE v_leftover INT;
    DECLARE v_donated INT;
    DECLARE v_wasted INT;

    WHILE i <= 30 DO
        SET v_date = DATE_SUB(CURRENT_DATE, INTERVAL i + 1 DAY);
        SET v_item = ((i * 3) % 12) + 1;
        SET v_leftover = 15 + (i % 12);
        SET v_donated = ROUND(v_leftover * 0.70);
        SET v_wasted = v_leftover - v_donated;

        INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty)
        VALUES (v_item, v_date, 100 + i, 100 + i - v_leftover, v_leftover);

        SET v_batch_id = LAST_INSERT_ID();

        INSERT INTO donations (food_batch_id, quantity, donated_at)
        VALUES (v_batch_id, v_donated, DATE_ADD(v_date, INTERVAL 19 HOUR));

        INSERT INTO waste_logs (food_batch_id, quantity, logged_at)
        VALUES (v_batch_id, v_wasted, DATE_ADD(v_date, INTERVAL 21 HOUR));

        SET i = i + 1;
    END WHILE;
END$$
DELIMITER ;

CALL seed_donations_and_waste();
DROP PROCEDURE IF EXISTS seed_donations_and_waste;

-- ----------------------------------------------------------------------------
-- 5b. Food Batches for Today (Current Inventory demo with Out of Stock, Low Stock <= 15, and Available)
-- ----------------------------------------------------------------------------
INSERT INTO food_batches (menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty) VALUES
(1, CURRENT_DATE, 100, 85, 15),   -- Kanda Poha (remaining 15 -> Low Stock)
(2, CURRENT_DATE, 180, 180, 0),   -- Crispy Samosa (remaining 0 -> Out of Stock)
(3, CURRENT_DATE, 130, 95, 35),   -- Special Veg Thali (remaining 35 -> Available)
(4, CURRENT_DATE, 95, 70, 25),    -- Masala Dosa (remaining 25 -> Available)
(5, CURRENT_DATE, 85, 73, 12),    -- Mumbai Pav Bhaji (remaining 12 -> Low Stock)
(6, CURRENT_DATE, 80, 72, 8),     -- Amritsari Chole Bhature (remaining 8 -> Low Stock)
(7, CURRENT_DATE, 70, 56, 14),    -- Idli Vada Combo (remaining 14 -> Low Stock)
(8, CURRENT_DATE, 90, 62, 28),    -- Paneer Kathi Roll (remaining 28 -> Available)
(9, CURRENT_DATE, 110, 78, 32),   -- Hyderabadi Veg Biryani (remaining 32 -> Available)
(10, CURRENT_DATE, 60, 60, 0),    -- Rava Upma (remaining 0 -> Out of Stock)
(11, CURRENT_DATE, 250, 205, 45), -- Special Masala Chai (remaining 45 -> Available)
(12, CURRENT_DATE, 160, 125, 35); -- South Indian Filter Coffee (remaining 35 -> Available)

-- ----------------------------------------------------------------------------
-- 6. Orders Placed for Today (Spanning Pending -> Confirmed -> Preparing -> Ready -> Collected / Cancelled)
-- ----------------------------------------------------------------------------
INSERT INTO orders (order_id, user_id, order_date, pickup_date, pickup_slot, payment_status, status) VALUES
(101, 5, DATE_SUB(NOW(), INTERVAL 15 MINUTE), CURRENT_DATE, '12:00 PM - 12:30 PM', 'Paid', 'Pending'),
(102, 6, DATE_SUB(NOW(), INTERVAL 25 MINUTE), CURRENT_DATE, '12:00 PM - 12:30 PM', 'Pending', 'Pending'),
(103, 7, DATE_SUB(NOW(), INTERVAL 40 MINUTE), CURRENT_DATE, '12:30 PM - 01:00 PM', 'Paid', 'Pending'),
(104, 8, DATE_SUB(NOW(), INTERVAL 50 MINUTE), CURRENT_DATE, '12:30 PM - 01:00 PM', 'Paid', 'Confirmed'),
(105, 9, DATE_SUB(NOW(), INTERVAL 60 MINUTE), CURRENT_DATE, '12:30 PM - 01:00 PM', 'Paid', 'Confirmed'),
(106, 10, DATE_SUB(NOW(), INTERVAL 75 MINUTE), CURRENT_DATE, '12:30 PM - 01:00 PM', 'Paid', 'Confirmed'),
(107, 11, DATE_SUB(NOW(), INTERVAL 80 MINUTE), CURRENT_DATE, '01:00 PM - 01:30 PM', 'Paid', 'Preparing'),
(108, 12, DATE_SUB(NOW(), INTERVAL 95 MINUTE), CURRENT_DATE, '01:00 PM - 01:30 PM', 'Paid', 'Preparing'),
(109, 13, DATE_SUB(NOW(), INTERVAL 110 MINUTE), CURRENT_DATE, '01:00 PM - 01:30 PM', 'Paid', 'Preparing'),
(110, 14, DATE_SUB(NOW(), INTERVAL 130 MINUTE), CURRENT_DATE, '12:00 PM - 12:30 PM', 'Paid', 'Ready'),
(111, 15, DATE_SUB(NOW(), INTERVAL 140 MINUTE), CURRENT_DATE, '12:30 PM - 01:00 PM', 'Paid', 'Ready'),
(112, 5, DATE_SUB(NOW(), INTERVAL 150 MINUTE), CURRENT_DATE, '12:30 PM - 01:00 PM', 'Paid', 'Ready'),
(113, 6, DATE_SUB(NOW(), INTERVAL 180 MINUTE), CURRENT_DATE, '11:30 AM - 12:00 PM', 'Paid', 'Collected'),
(114, 7, DATE_SUB(NOW(), INTERVAL 200 MINUTE), CURRENT_DATE, '11:30 AM - 12:00 PM', 'Paid', 'Collected'),
(115, 8, DATE_SUB(NOW(), INTERVAL 220 MINUTE), CURRENT_DATE, '12:00 PM - 12:30 PM', 'Failed', 'Cancelled');

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES
(101, 3, 2, 85.00), -- 2 Veg Thali
(101, 11, 2, 12.00),-- 2 Chai
(102, 9, 2, 90.00), -- 2 Biryani
(102, 12, 1, 18.00),-- 1 Coffee
(103, 1, 3, 25.00), -- 3 Poha
(103, 11, 3, 12.00),-- 3 Chai
(104, 5, 2, 65.00), -- 2 Pav Bhaji
(105, 4, 2, 50.00), -- 2 Masala Dosa
(105, 12, 2, 18.00),-- 2 Coffee
(106, 6, 2, 75.00), -- 2 Chole Bhature
(107, 8, 2, 55.00), -- 2 Paneer Roll
(107, 11, 1, 12.00),-- 1 Chai
(108, 9, 3, 90.00), -- 3 Biryani
(109, 3, 1, 85.00), -- 1 Veg Thali
(109, 2, 2, 20.00), -- 2 Samosa
(110, 4, 1, 50.00), -- 1 Masala Dosa
(111, 7, 2, 40.00), -- 2 Idli Vada
(112, 5, 1, 65.00), -- 1 Pav Bhaji
(112, 11, 2, 12.00),-- 2 Chai
(113, 1, 2, 25.00), -- 2 Poha
(114, 2, 3, 20.00), -- 3 Samosa
(114, 11, 2, 12.00),-- 2 Chai
(115, 6, 1, 75.00); -- 1 Chole Bhature

-- ----------------------------------------------------------------------------
-- 7. Complaints (40 Real-World Grievances Across All Statuses, SLA Deadlines & Breaches)
-- ----------------------------------------------------------------------------
-- Resolved Complaints (Historical)
INSERT INTO complaints (complaint_id, user_id, menu_item_id, description, category, severity, status, assigned_to, created_at, resolution_deadline, resolved_at, escalation_level) VALUES
(1, 5, 1, 'Found a tiny pebble in the Kanda Poha breakfast batch.', 'foreign_object', 'medium', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 13 DAY), INTERVAL 2 HOUR), 0),
(2, 6, 3, 'Special Veg Thali was delivered lukewarm and subji was slightly salty.', 'food_quality', 'low', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), 0),
(3, 7, 11, 'Counter cashier was rude when asked for digital UPI receipt.', 'service', 'medium', 'resolved', 1, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 9 DAY), INTERVAL 5 HOUR), 0),
(4, 8, 4, 'Sambhar smelled slightly sour during late breakfast rush.', 'food_quality', 'high', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 8 DAY), INTERVAL 4 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 8 DAY), INTERVAL 2 HOUR), 0),
(5, 9, 2, 'Samosa crust was completely raw from the inside.', 'food_quality', 'medium', 'resolved', 3, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 10 HOUR), 0),
(6, 10, 8, 'Thin hair found wrapped in the butter paper of the paneer roll.', 'hygiene', 'high', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 4 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 6 DAY), INTERVAL 3 HOUR), 0),
(7, 11, 9, 'Rice portion had an unwashed dirt spot near cabbage garnish.', 'hygiene', 'medium', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 4 DAY), INTERVAL 6 HOUR), 0),
(8, 12, 5, 'Pav Bhaji was over-spiced and butter smelled rancid.', 'food_quality', 'high', 'resolved', 3, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 4 HOUR), DATE_ADD(DATE_SUB(NOW(), INTERVAL 5 DAY), INTERVAL 3 HOUR), 0),
(9, 13, 12, 'Filter coffee was cold and cup had fingerprints on the rim.', 'hygiene', 'medium', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL 3 DAY), INTERVAL 4 HOUR), 0),
(10, 14, 6, 'Chole gravy had excessive food color leaving heavy stains.', 'food_quality', 'low', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 0);

-- In-Progress Complaints
INSERT INTO complaints (complaint_id, user_id, menu_item_id, description, category, severity, status, assigned_to, created_at, resolution_deadline, escalation_level) VALUES
(11, 5, 3, 'Found small thread piece in rice of Special Veg Thali.', 'foreign_object', 'low', 'in_progress', 2, DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_ADD(NOW(), INTERVAL 64 HOUR), 0),
(12, 6, 2, 'Samosa oil tasted burnt and left an unpleasant bitter aftertaste.', 'food_quality', 'medium', 'in_progress', 2, DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_ADD(NOW(), INTERVAL 19 HOUR), 0),
(13, 7, 7, 'Idli Vada sambhar had a stale odor this morning.', 'food_quality', 'high', 'in_progress', 3, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 3 HOUR), 0),
(14, 8, 11, 'Tea counter was untidy with spilled tea everywhere.', 'hygiene', 'medium', 'in_progress', 2, DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_ADD(NOW(), INTERVAL 21 HOUR), 0),
(15, 9, 8, 'Delayed food pickup: 25 minute wait time for roll during break.', 'service', 'low', 'in_progress', 1, DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_ADD(NOW(), INTERVAL 66 HOUR), 0);

-- Open Complaints (Within SLA)
INSERT INTO complaints (complaint_id, user_id, menu_item_id, description, category, severity, status, created_at, resolution_deadline, escalation_level) VALUES
(16, 10, 4, 'Chutney was watery and had sour off-taste.', 'food_quality', 'medium', 'open', DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 22 HOUR), 0),
(17, 11, 1, 'Poha was served without lemon and was lukewarm.', 'food_quality', 'low', 'open', DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 71 HOUR), 0),
(18, 12, 5, 'Dirty plate with previous food residue handed at counter.', 'hygiene', 'medium', 'open', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_ADD(NOW(), INTERVAL 21 HOUR), 0),
(19, 13, 9, 'Veg Biryani was unseasoned and vegetables were undercooked.', 'food_quality', 'medium', 'open', DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_ADD(DATE_ADD(NOW(), INTERVAL 23 HOUR), INTERVAL 30 MINUTE), 0),
(20, 14, 12, 'Overcharged ₹25 for filter coffee listed at ₹18 on noticeboard.', 'service', 'medium', 'open', DATE_SUB(NOW(), INTERVAL 45 MINUTE), DATE_ADD(DATE_ADD(NOW(), INTERVAL 23 HOUR), INTERVAL 15 MINUTE), 0);

-- CRITICAL / OVERDUE & ESCALATED COMPLAINTS (Key for viva showcase)
INSERT INTO complaints (complaint_id, user_id, menu_item_id, description, category, severity, status, assigned_to, created_at, resolution_deadline, escalated_at, escalation_level) VALUES
(21, 5, 3, 'URGENT: Cockroach found crawling inside dal bowl of Veg Thali!', 'hygiene', 'critical', 'escalated', 2, DATE_SUB(NOW(), INTERVAL 18 HOUR), DATE_SUB(NOW(), INTERVAL 16 HOUR), DATE_SUB(NOW(), INTERVAL 15 HOUR), 1),
(22, 6, 9, 'Live worm seen inside the salad bowl accompanying the Veg Biryani.', 'hygiene', 'critical', 'escalated', 2, DATE_SUB(NOW(), INTERVAL 20 HOUR), DATE_SUB(NOW(), INTERVAL 18 HOUR), DATE_SUB(NOW(), INTERVAL 17 HOUR), 1),
(23, 7, 5, 'Glass piece found in Pav Bhaji! Could have caused serious injury!', 'foreign_object', 'critical', 'escalated', 1, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 10 HOUR), DATE_SUB(NOW(), INTERVAL 9 HOUR), 2),
(24, 8, 2, 'Dead fly found embedded inside fried samosa casing.', 'hygiene', 'high', 'escalated', 3, DATE_SUB(NOW(), INTERVAL 28 HOUR), DATE_SUB(NOW(), INTERVAL 24 HOUR), DATE_SUB(NOW(), INTERVAL 22 HOUR), 1),
(25, 9, 7, 'Curd served with combo was completely expired and rotten smell.', 'food_quality', 'high', 'escalated', 2, DATE_SUB(NOW(), INTERVAL 36 HOUR), DATE_SUB(NOW(), INTERVAL 32 HOUR), DATE_SUB(NOW(), INTERVAL 30 HOUR), 1),
-- Overdue tickets that are STILL 'open' or 'in_progress' (ready for "Run escalation now" live test)
(26, 10, 8, 'Sharp iron staple pin found in the paneer roll filling.', 'foreign_object', 'high', 'in_progress', 2, DATE_SUB(NOW(), INTERVAL 10 HOUR), DATE_SUB(NOW(), INTERVAL 6 HOUR), NULL, 0),
(27, 11, 1, 'Lizard seen near the open poha cooking vat in the morning.', 'hygiene', 'critical', 'open', NULL, DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 0),
(28, 12, 10, 'Smell of kerosene in the rava upma plate.', 'food_quality', 'high', 'open', NULL, DATE_SUB(NOW(), INTERVAL 7 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL, 0),
(29, 13, 6, 'Plastic wrapper piece cooked into the bhatura dough.', 'foreign_object', 'high', 'in_progress', 3, DATE_SUB(NOW(), INTERVAL 9 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR), NULL, 0),
(30, 14, 3, 'Foul spoiled odor from paneer gravy in afternoon thali.', 'food_quality', 'high', 'open', NULL, DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_SUB(NOW(), INTERVAL 4 HOUR), NULL, 0);

-- Additional Miscellaneous Tickets (31 to 40)
INSERT INTO complaints (complaint_id, user_id, menu_item_id, description, category, severity, status, assigned_to, created_at, resolution_deadline, resolved_at, escalation_level) VALUES
(31, 5, 11, 'Chai glasses have chipped glass rims, posing cut hazard.', 'foreign_object', 'high', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 24 DAY), DATE_SUB(NOW(), INTERVAL 24 DAY), 0),
(32, 6, 1, 'Poha had several black insects in batch.', 'hygiene', 'high', 'closed', 2, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY), 0),
(33, 7, 9, 'Biryani chicken piece was placed in veg order by mistake.', 'food_quality', 'high', 'resolved', 1, DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY), DATE_SUB(NOW(), INTERVAL 17 DAY), 0),
(34, 8, 4, 'Dosa batter had spoiled smell on Monday morning.', 'food_quality', 'high', 'closed', 2, DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY), 0),
(35, 9, 2, 'Foreign plastic thread stuck to mint chutney.', 'foreign_object', 'medium', 'closed', 3, DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), 0),
(36, 10, 5, 'Butter smelled expired and stale.', 'food_quality', 'high', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 11 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), 0),
(37, 11, 8, 'Hair found in roll mayonnaise dressing.', 'hygiene', 'high', 'resolved', 2, DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), 0),
(38, 12, 12, 'Coffee machine dispensed dirty sediment.', 'hygiene', 'medium', 'open', NULL, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 23 HOUR), NULL, 0),
(39, 13, 7, 'Vada was extremely oily and burnt on edges.', 'food_quality', 'low', 'in_progress', 3, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 68 HOUR), NULL, 0),
(40, 14, 3, 'Rude counter attendant refused drinking water glasses.', 'service', 'medium', 'open', NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 22 HOUR), NULL, 0);

-- ----------------------------------------------------------------------------
-- 8. Seed Complaint Actions (Historical Lifecycle Events)
-- ----------------------------------------------------------------------------
INSERT INTO complaint_actions (complaint_id, action_by, action_type, remarks, created_at) VALUES
(21, 5, 'note', 'Ticket submitted: Cockroach found in dal bowl', DATE_SUB(NOW(), INTERVAL 18 HOUR)),
(21, 2, 'assigned', 'Assigned to Chef Suresh Kumar for kitchen inspection', DATE_SUB(NOW(), INTERVAL 17 HOUR)),
(21, 1, 'escalated', 'Automated escalation: Critical SLA breached (+2h deadline passed)', DATE_SUB(NOW(), INTERVAL 15 HOUR)),
(22, 6, 'note', 'Ticket submitted: Live worm seen inside salad bowl', DATE_SUB(NOW(), INTERVAL 20 HOUR)),
(22, 1, 'escalated', 'Automated escalation: Critical hygiene ticket unaddressed', DATE_SUB(NOW(), INTERVAL 17 HOUR)),
(23, 7, 'note', 'Ticket submitted: Glass piece found in Pav Bhaji', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
(23, 1, 'status_change', 'Status updated to in_progress by Admin', DATE_SUB(NOW(), INTERVAL 11 HOUR)),
(23, 1, 'escalated', 'Escalation to level 2: Pending vendor investigation', DATE_SUB(NOW(), INTERVAL 9 HOUR)),
(26, 10, 'note', 'Ticket submitted: Staple pin in roll', DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(26, 2, 'status_change', 'Status changed to in_progress', DATE_SUB(NOW(), INTERVAL 9 HOUR));

-- ----------------------------------------------------------------------------
-- 9. Seed Audit Logs (Sample records)
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value, changed_by, changed_at) VALUES
('complaints', 21, 'INSERT', NULL, JSON_OBJECT('complaint_id', 21, 'severity', 'critical', 'status', 'open'), 5, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
('complaints', 21, 'UPDATE', JSON_OBJECT('status', 'open', 'assigned_to', NULL), JSON_OBJECT('status', 'open', 'assigned_to', 2), 1, DATE_SUB(NOW(), INTERVAL 17 HOUR)),
('complaints', 21, 'UPDATE', JSON_OBJECT('status', 'open', 'escalation_level', 0), JSON_OBJECT('status', 'escalated', 'escalation_level', 1), 1, DATE_SUB(NOW(), INTERVAL 15 HOUR)),
('complaints', 23, 'INSERT', NULL, JSON_OBJECT('complaint_id', 23, 'severity', 'critical', 'status', 'open'), 7, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('complaints', 23, 'UPDATE', JSON_OBJECT('status', 'in_progress', 'escalation_level', 1), JSON_OBJECT('status', 'escalated', 'escalation_level', 2), 1, DATE_SUB(NOW(), INTERVAL 9 HOUR));

SET FOREIGN_KEY_CHECKS = 1;
