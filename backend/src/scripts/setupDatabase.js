/* global process */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../../../database/member4');

const SQL_FILES = [
  '01_stubs.sql',
  '02_member4_schema.sql',
  '03_triggers.sql',
  '04_procedures.sql',
  '05_views.sql',
  '06_seed.sql',
  '07_roles.sql',
];

async function runSetup() {
  console.log('--- PlateWise Member 4 Database Setup ---');
  console.log(`Target Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  console.log(`Target Database: ${process.env.DB_NAME}`);

  let connection;
  try {
    // 1. Connect without database first to ensure DB exists
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'platewise_root',
      multipleStatements: true,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'platewise_db'}\`;`);
    await connection.query(`USE \`${process.env.DB_NAME || 'platewise_db'}\`;`);

    // 2. Execute SQL files in strict sequence
    for (const file of SQL_FILES) {
      const filePath = path.join(dbDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[SKIP] File not found: ${filePath}`);
        continue;
      }

      console.log(`Executing ${file}...`);
      let sql = fs.readFileSync(filePath, 'utf-8');

      // Remove DELIMITER commands for mysql2 driver compatibility
      sql = sql.replace(/DELIMITER \$\$/g, '').replace(/DELIMITER ;/g, '').replace(/\$\$/g, ';');

      await connection.query(sql);
      console.log(`✓ ${file} executed successfully.`);
    }

    console.log('\nAll Member 4 SQL files executed cleanly!');
  } catch (error) {
    console.error('\nDatabase setup encountered error:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runSetup();
