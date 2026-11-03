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
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: process.env.DB_NAME || 'platewise_db',
    multipleStatements: true,
  });

  try {
    console.log('[Migration 12] Applying 12_menu_availability_migration.sql...');
    const sqlPath = path.resolve(__dirname, '../../../database/member4/12_menu_availability_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('[Migration 12] ✓ SQL executed successfully.');

    // Verify column exists
    const [cols] = await conn.query(
      `SELECT column_name, data_type, is_nullable, column_type, column_default
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'menu_items'
         AND COLUMN_NAME = 'is_available'`
    );
    console.log('[Migration 12] ✓ menu_items.is_available column verification:', cols);

    // Verify sample rows
    const [items] = await conn.query('SELECT menu_item_id, name, category, price, is_available FROM menu_items LIMIT 5');
    console.log('[Migration 12] ✓ Sample menu items with is_available:', items);
  } catch (err) {
    console.error('[Migration 12 Error]:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
