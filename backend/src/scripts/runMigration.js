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

async function runMigration() {
  const migrations = [
    '09_auth_migration.sql',
    '10_account_status_migration.sql',
  ];

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: process.env.DB_NAME || 'platewise_db',
    multipleStatements: true,
  });

  try {
    for (const m of migrations) {
      const migrationPath = path.resolve(__dirname, '../../../database/member4', m);
      if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found at: ${migrationPath}`);
        process.exit(1);
      }
      const sql = fs.readFileSync(migrationPath, 'utf8');
      console.log(`[Migration] Applying ${m} to platewise_db...`);
      await connection.query(sql);
      console.log(`[Migration] ${m} applied successfully.`);
    }

    const [cols] = await connection.query(
      `SELECT column_name, data_type, is_nullable, column_type, column_default
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME IN ('email', 'role', 'account_status', 'password_hash')`
    );
    console.log('[Migration] Verified users columns:', cols);
  } catch (err) {
    console.error('[Migration Error]:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

runMigration();
