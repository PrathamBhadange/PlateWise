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
  const targetDb = process.argv[2] || process.env.DB_NAME || 'platewise_db';
  console.log(`[Migration 17] Running on database: ${targetDb}...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: targetDb,
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve(__dirname, '../../../database/member4/17_ngo_portal_enhancements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('[Migration 17] ✓ SQL executed successfully.');

    // Verify added columns exist in users
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('organization_name', 'contact_person', 'phone_number', 'address')`
    );
    console.log('[Migration 17] ✓ Verified columns in users table:');
    console.table(cols);

    // Verify ngo_notifications table exists
    const [tables] = await conn.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'ngo_notifications'`
    );
    console.log('[Migration 17] ✓ Verified ngo_notifications table:', tables);
  } catch (err) {
    console.error('[Migration 17 Error]:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
