/* global process */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'platewise_root',
    database: process.env.DB_NAME || 'platewise_db',
    multipleStatements: true,
  });

  try {
    console.log('[Migration 13] Applying 13_pickup_slots_migration.sql...');
    const sqlPath = path.resolve(__dirname, '../../../database/member4/13_pickup_slots_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('[Migration 13] ✓ SQL executed successfully.');

    // Verify pickup_slots table
    const [slots] = await conn.query('SELECT slot_id, slot, start_time, end_time, max_capacity, is_active FROM pickup_slots ORDER BY sort_order');
    console.log('[Migration 13] ✓ Registered pickup slots:', slots);

    // Verify index on orders
    const [indexes] = await conn.query(
      `SELECT index_name, column_name, seq_in_index
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'orders'
         AND INDEX_NAME = 'idx_orders_slot_date_status'`
    );
    console.log('[Migration 13] ✓ orders index verified:', indexes.map(i => `${i.column_name} (#${i.seq_in_index})`));
  } catch (err) {
    console.error('[Migration 13 Error]:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
