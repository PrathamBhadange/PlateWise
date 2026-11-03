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
  console.log(`[Migration 15] Running on database: ${targetDb}...`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'platewise_root',
    database: targetDb,
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve(__dirname, '../../../database/member4/15_complaint_proof_image_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('[Migration 15] ✓ SQL executed successfully.');

    // Verify proof_image column exists
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'complaints'
         AND COLUMN_NAME = 'proof_image'`
    );
    console.log('[Migration 15] ✓ Verified column in complaints table:', cols);
  } catch (err) {
    console.error('[Migration 15 Error]:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
