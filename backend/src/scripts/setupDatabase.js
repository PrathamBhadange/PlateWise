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
  const dbName = process.env.DB_NAME || 'platewise_db';
  console.log('================================================================================');
  console.log(' PlateWise Member 4 Database Setup');
  console.log('================================================================================');
  console.log(`Target Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  console.log(`Target Database: ${dbName}`);
  console.log('--------------------------------------------------------------------------------');

  let connection;
  try {
    // 1. Connect without database first to drop & recreate it cleanly
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'platewise_root',
      multipleStatements: true,
    });

    console.log(`[1/3] Resetting database: DROP DATABASE IF EXISTS \`${dbName}\`...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    console.log(`[2/3] Creating fresh database \`${dbName}\` with utf8mb4_unicode_ci...`);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    // 2. Execute SQL files in strict sequence
    console.log('[3/3] Executing Member 4 SQL files in order:');
    for (const file of SQL_FILES) {
      const filePath = path.join(dbDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`  [SKIP] File not found: ${filePath}`);
        continue;
      }

      let sql = fs.readFileSync(filePath, 'utf-8');

      // Strip DELIMITER statements for mysql2 driver compatibility
      sql = sql.replace(/DELIMITER \$\$/g, '').replace(/DELIMITER ;/g, '').replace(/\$\$/g, ';');

      await connection.query(sql);
      console.log(`  ✓ ${file} executed successfully.`);
    }

    // 3. Seed Sanity Check
    console.log('--------------------------------------------------------------------------------');
    console.log(' Seed Data Sanity Verification');
    console.log('--------------------------------------------------------------------------------');
    console.log(' Table Name       | Actual Rows | Status');
    console.log('--------------------------------------------------------------------------------');

    const checkTables = [
      { name: 'menu_items', min: 12 },
      { name: 'sales_history', min: 500 },
      { name: 'complaints', min: 40 },
      { name: 'donations', min: 30 },
      { name: 'audit_logs', min: 5 },
    ];

    for (const item of checkTables) {
      const [rows] = await connection.query(`SELECT COUNT(*) AS cnt FROM \`${item.name}\``);
      const count = rows[0]?.cnt || 0;
      const status = count >= item.min ? '✓ OK' : '⚠ WARNING (Below expected)';
      console.log(` ${item.name.padEnd(16)} | ${String(count).padStart(11)} | ${status}`);
    }

    console.log('================================================================================');
    console.log(' Database initialization completed successfully with 0 errors.');
    console.log('================================================================================\n');
  } catch (error) {
    console.error('\nDatabase setup failed with error:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runSetup();
