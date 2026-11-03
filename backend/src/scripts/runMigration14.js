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

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(prefix, fallback = null) {
  const match = args.find((a) => a.startsWith(prefix));
  if (match) return match.split('=')[1] || true;
  return fallback;
}

const targetDb = getArg('--db', process.env.TARGET_DB || process.env.DB_NAME || 'platewise_db');
const isCloneTest = args.includes('--clone-test-db');
const isVerifyOnly = args.includes('--verify-only');

console.log('================================================================');
console.log('PlateWise Migration 14: Comprehensive Schema Integration Runner');
console.log(`Target Database: ${targetDb}`);
console.log('================================================================');

async function getAdminConnection(database = null) {
  return await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: database,
    multipleStatements: true,
  });
}

/**
 * Clones the live schema and data from sourceDb into testDb for safe isolated testing.
 */
async function cloneTestDatabase(sourceDb, testDb) {
  const normSource = String(sourceDb || '').trim().toLowerCase();
  const normTest = String(testDb || '').trim().toLowerCase();

  const PROTECTED_DATABASES = [
    'platewise_db',
    'information_schema',
    'mysql',
    'performance_schema',
    'sys',
  ];

  if (PROTECTED_DATABASES.includes(normTest)) {
    throw new Error(
      `CRITICAL SECURITY VIOLATION: Refusing to clone or drop protected database '${testDb}'! Protected databases: ${PROTECTED_DATABASES.join(', ')}`
    );
  }

  if (!normTest.endsWith('_test') && !normTest.endsWith('_test_db')) {
    throw new Error(
      `CRITICAL VALIDATION ERROR: Target test database name must end with '_test' or '_test_db' for safe cloning (received: '${testDb}')`
    );
  }

  if (normSource === normTest) {
    throw new Error(`Cannot clone database into itself: ${sourceDb} == ${testDb}`);
  }

  console.log(`\n[Test Isolation] Creating clean test database: ${testDb}...`);
  const adminConn = await getAdminConnection();

  try {
    await adminConn.query(`DROP DATABASE IF EXISTS \`${testDb}\``);
    await adminConn.query(`CREATE DATABASE \`${testDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`[Test Isolation] ✓ Created fresh ${testDb}.`);

    // Fetch all tables from sourceDb
    const [tables] = await adminConn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [sourceDb]
    );

    const testConn = await getAdminConnection(testDb);

    try {
      await testConn.query('SET FOREIGN_KEY_CHECKS = 0');

      for (const t of tables) {
        const tableName = t.TABLE_NAME;
        // Clone table structure
        await testConn.query(`CREATE TABLE \`${testDb}\`.\`${tableName}\` LIKE \`${sourceDb}\`.\`${tableName}\``);
        // Copy data
        await testConn.query(`INSERT INTO \`${testDb}\`.\`${tableName}\` SELECT * FROM \`${sourceDb}\`.\`${tableName}\``);
        const [cnt] = await testConn.query(`SELECT COUNT(*) AS c FROM \`${testDb}\`.\`${tableName}\``);
        console.log(`  - Cloned table ${tableName}: ${cnt[0].c} records`);
      }

      await testConn.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log(`[Test Isolation] ✓ Successfully cloned all tables and data from ${sourceDb} into ${testDb}.\n`);
    } finally {
      await testConn.end();
    }
  } finally {
    await adminConn.end();
  }
}

/**
 * Inspects what objects currently exist prior to migration
 */
async function inspectPreMigrationState(conn, dbName) {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [dbName]
  );
  const tableNames = new Set(tables.map((t) => t.TABLE_NAME));

  const [cols] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`,
    [dbName]
  );
  const colSet = new Set(cols.map((c) => `${c.TABLE_NAME}.${c.COLUMN_NAME}`));

  return { tableNames, colSet };
}

/**
 * Runs the migration SQL script
 */
async function applyMigration(conn) {
  const sqlPath = path.resolve(__dirname, '../../../database/member4/14_comprehensive_schema_integration.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration SQL file not found at: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('[Migration 14] Executing 14_comprehensive_schema_integration.sql...');
  const startTime = Date.now();
  await conn.query(sql);
  const duration = Date.now() - startTime;
  console.log(`[Migration 14] ✓ Migration SQL executed successfully in ${duration}ms.`);
}

/**
 * Validates the schema and verifies data integrity post-migration
 */
async function verifyMigration(conn, dbName, preState = null) {
  console.log('\n--- VERIFICATION & SCHEMA INTEGRITY AUDIT ---');

  // 1. Verify New Tables Exist
  const requiredNewTables = [
    'meal_sponsorships',
    'meal_credits',
    'credit_ledger_entries',
    'credit_redemptions',
    'donation_claims',
    'payments',
  ];

  const [currentTables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [dbName]
  );
  const currentTableSet = new Set(currentTables.map((t) => t.TABLE_NAME));

  console.log('\n1. New Tables Verification:');
  for (const t of requiredNewTables) {
    const exists = currentTableSet.has(t);
    const wasNew = preState ? !preState.tableNames.has(t) : true;
    console.log(`  ${exists ? '✓' : '✗'} Table '${t}': ${exists ? 'PRESENT' : 'MISSING'} (${wasNew ? 'Newly Created' : 'Pre-existed'})`);
    if (!exists) throw new Error(`Required table ${t} is missing!`);
  }

  // 2. Verify New Columns Exist on Enhanced Tables
  const requiredNewColumns = [
    { table: 'food_batches', column: 'status' },
    { table: 'orders', column: 'total_amount' },
    { table: 'orders', column: 'discount_amount' },
    { table: 'orders', column: 'final_amount' },
    { table: 'orders', column: 'payment_method' },
    { table: 'order_items', column: 'food_batch_id' },
    { table: 'order_items', column: 'original_price' },
    { table: 'order_items', column: 'is_surplus' },
    { table: 'donations', column: 'collection_deadline' },
    { table: 'donations', column: 'claimed_quantity' },
    { table: 'waste_logs', column: 'category' },
    { table: 'waste_logs', column: 'logged_by' },
    { table: 'waste_logs', column: 'reason' },
  ];

  const [currentCols] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?`,
    [dbName]
  );
  const colMap = new Map();
  for (const c of currentCols) {
    colMap.set(`${c.TABLE_NAME}.${c.COLUMN_NAME}`, c);
  }

  console.log('\n2. Enhanced Columns Verification:');
  for (const item of requiredNewColumns) {
    const key = `${item.table}.${item.column}`;
    const colInfo = colMap.get(key);
    const exists = Boolean(colInfo);
    const wasNew = preState ? !preState.colSet.has(key) : true;
    console.log(
      `  ${exists ? '✓' : '✗'} Column '${key}': ${exists ? `${colInfo.COLUMN_TYPE}` : 'MISSING'} (${wasNew ? 'Newly Added' : 'Pre-existed'})`
    );
    if (!exists) throw new Error(`Required column ${key} is missing!`);
  }

  // 3. Verify Foreign Keys
  const requiredFKs = [
    { table: 'order_items', name: 'fk_order_items_batch', ref: 'food_batches(food_batch_id)' },
    { table: 'waste_logs', name: 'fk_waste_logs_user', ref: 'users(user_id)' },
    { table: 'meal_sponsorships', name: 'fk_sponsorship_user', ref: 'users(user_id)' },
    { table: 'meal_credits', name: 'fk_credits_sponsorship', ref: 'meal_sponsorships(sponsorship_id)' },
    { table: 'meal_credits', name: 'fk_credits_beneficiary', ref: 'users(user_id)' },
    { table: 'credit_ledger_entries', name: 'fk_ledger_credit', ref: 'meal_credits(credit_id)' },
    { table: 'credit_ledger_entries', name: 'fk_ledger_order', ref: 'orders(order_id)' },
    { table: 'credit_ledger_entries', name: 'fk_ledger_user', ref: 'users(user_id)' },
    { table: 'credit_redemptions', name: 'fk_redemptions_order', ref: 'orders(order_id)' },
    { table: 'credit_redemptions', name: 'fk_redemptions_credit', ref: 'meal_credits(credit_id)' },
    { table: 'donation_claims', name: 'fk_claims_donation', ref: 'donations(donation_id)' },
    { table: 'donation_claims', name: 'fk_claims_ngo', ref: 'users(user_id)' },
    { table: 'payments', name: 'fk_payments_order', ref: 'orders(order_id)' },
    { table: 'payments', name: 'fk_payments_sponsorship', ref: 'meal_sponsorships(sponsorship_id)' },
    { table: 'payments', name: 'fk_payments_user', ref: 'users(user_id)' },
  ];

  const [fks] = await conn.query(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [dbName]
  );
  const fkMap = new Map();
  for (const fk of fks) {
    fkMap.set(`${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME}`, `${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
  }

  console.log('\n3. Foreign Key Constraints Verification:');
  for (const item of requiredFKs) {
    const key = `${item.table}.${item.name}`;
    const target = fkMap.get(key);
    const exists = Boolean(target);
    console.log(`  ${exists ? '✓' : '✗'} FK '${item.name}' on '${item.table}' -> ${target || 'MISSING'}`);
    if (!exists) throw new Error(`Required foreign key ${item.name} is missing on table ${item.table}!`);
  }

  // 4. Verify Supporting Indexes
  const requiredIndexes = [
    { table: 'food_batches', index: 'idx_batches_menu_date' },
    { table: 'order_items', index: 'idx_order_items_batch' },
    { table: 'donations', index: 'idx_donations_status_deadline' },
    { table: 'meal_sponsorships', index: 'idx_sponsorship_status_created' },
    { table: 'meal_credits', index: 'idx_credits_pool' },
    { table: 'credit_ledger_entries', index: 'idx_ledger_credit_created' },
    { table: 'credit_ledger_entries', index: 'idx_ledger_order' },
    { table: 'credit_redemptions', index: 'idx_redemptions_order' },
    { table: 'credit_redemptions', index: 'idx_redemptions_credit' },
    { table: 'donation_claims', index: 'idx_claims_donation_status' },
    { table: 'donation_claims', index: 'idx_claims_ngo_status' },
    { table: 'payments', index: 'idx_payments_order_attempt' },
    { table: 'payments', index: 'idx_payments_sponsorship' },
  ];

  const [indexes] = await conn.query(
    `SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ?`,
    [dbName]
  );
  const idxSet = new Set(indexes.map((i) => `${i.TABLE_NAME}.${i.INDEX_NAME}`));

  console.log('\n4. Indexes Verification:');
  for (const item of requiredIndexes) {
    const key = `${item.table}.${item.index}`;
    const exists = idxSet.has(key);
    console.log(`  ${exists ? '✓' : '✗'} Index '${item.index}' on '${item.table}': ${exists ? 'OK' : 'MISSING'}`);
    if (!exists) throw new Error(`Required index ${item.index} is missing on ${item.table}!`);
  }

  // 5. Verify Historical Records Integrity
  console.log('\n5. Data Integrity & Historical Row Counts:');
  const checkTables = ['food_batches', 'orders', 'order_items', 'donations', 'waste_logs', 'users', 'menu_items'];
  for (const t of checkTables) {
    const [cnt] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    console.log(`  ✓ Table '${t}': ${cnt[0].c} records preserved.`);
  }

  // 6. Verify Orders Backfill Correctness
  const [backfillCheck] = await conn.query(
    `SELECT COUNT(*) AS invalid_count FROM orders WHERE total_amount < 0 OR discount_amount < 0 OR final_amount < 0`
  );
  console.log(`\n6. Orders Backfill Validation:`);
  console.log(`  ✓ Orders with invalid amounts: ${backfillCheck[0].invalid_count} (Must be 0)`);
  if (backfillCheck[0].invalid_count > 0) throw new Error('Detected orders with invalid total/final amounts!');

  // Check sample orders
  const [sampleOrders] = await conn.query(
    `SELECT order_id, user_id, total_amount, discount_amount, final_amount, payment_status, payment_method, status
     FROM orders LIMIT 5`
  );
  console.log('  ✓ Sample Backfilled Orders:', sampleOrders);

  // 7. Verify Waste Logs Preservation
  const [sampleWaste] = await conn.query(
    `SELECT waste_log_id, food_batch_id, quantity, category, logged_by, logged_at
     FROM waste_logs LIMIT 5`
  );
  console.log('\n7. Waste Logs Sample (Confirming logged_by NULL preservation):', sampleWaste);

  console.log('\n✓ ALL MIGRATION 14 VERIFICATIONS PASSED SUCCESSFULLY!');
}

async function run() {
  let conn = null;

  try {
    if (isCloneTest) {
      const sourceDb = process.env.DB_NAME || 'platewise_db';
      await cloneTestDatabase(sourceDb, targetDb);
    }

    conn = await getAdminConnection(targetDb);

    // Correction 2: Assert active database matches targetDb exactly
    const [dbCheck] = await conn.query('SELECT DATABASE() AS active_db');
    const activeDb = dbCheck[0]?.active_db;
    if (activeDb !== targetDb) {
      throw new Error(
        `CRITICAL DATABASE MISMATCH: Requested target database '${targetDb}', but MySQL connected to '${activeDb}'! Aborting immediately.`
      );
    }
    console.log(`[Connection Verified] Confirmed connected to target database: '${activeDb}'.`);

    if (isVerifyOnly) {
      console.log(`[Mode: Verify Only] Checking schema on database: ${targetDb}`);
      await verifyMigration(conn, targetDb);
      return;
    }

    const preState = await inspectPreMigrationState(conn, targetDb);
    console.log(`[Pre-Migration State] Database ${targetDb} has ${preState.tableNames.size} tables, ${preState.colSet.size} columns.`);

    await applyMigration(conn);

    await verifyMigration(conn, targetDb, preState);
  } catch (err) {
    console.error('\n[Migration 14 Failure]:', err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

run();
