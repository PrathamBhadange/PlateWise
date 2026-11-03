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
  console.log(`[Migration 16] Running on database: ${targetDb}...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: targetDb,
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve(__dirname, '../../../database/member4/16_production_batches_enhancement.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('[Migration 16] ✓ SQL executed successfully.');

    // Verify added columns exist
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'food_batches'
         AND COLUMN_NAME IN ('meal_session', 'batch_code', 'notes', 'created_by', 'created_at', 'updated_at')`
    );
    console.log('[Migration 16] ✓ Verified columns in food_batches table:');
    console.table(cols);
  } catch (err) {
    console.error('[Migration 16 Error]:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
