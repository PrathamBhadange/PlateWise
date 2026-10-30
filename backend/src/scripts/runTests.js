/* global process */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testFile = path.resolve(__dirname, '../../../database/member4/08_tests.sql');

async function runTests() {
  console.log('--- PlateWise Member 4 DBMS Automated Test Suite ---');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'platewise_root',
      database: process.env.DB_NAME || 'platewise_db',
      multipleStatements: true,
    });

    console.log(`Connected to ${process.env.DB_NAME}. Executing 08_tests.sql...\n`);

    let sql = fs.readFileSync(testFile, 'utf-8');
    sql = sql.replace(/DELIMITER \$\$/g, '').replace(/DELIMITER ;/g, '').replace(/\$\$/g, ';');

    const [results] = await connection.query(sql);

    // Find the SELECT * FROM test_results result set
    let testRows = null;
    if (Array.isArray(results)) {
      for (const res of results) {
        if (Array.isArray(res) && res.length > 0 && res[0].test_number !== undefined) {
          testRows = res;
          break;
        }
      }
    }

    if (testRows) {
      console.log('--------------------------------------------------------------------------------');
      console.log(' # | Test Name                             | Status | Details');
      console.log('--------------------------------------------------------------------------------');
      let passedCount = 0;
      for (const row of testRows) {
        const pass = row.status === 'PASSED';
        if (pass) passedCount++;
        const badge = pass ? '✓ PASSED' : '✗ FAILED';
        console.log(
          ` ${row.test_number} | ${row.test_name.padEnd(37)} | ${badge} | ${row.details}`
        );
      }
      console.log('--------------------------------------------------------------------------------');
      console.log(`Results: ${passedCount}/${testRows.length} tests passed.\n`);
    } else {
      console.log('Executed 08_tests.sql successfully.');
    }
  } catch (error) {
    console.error('Test execution error:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

runTests();
