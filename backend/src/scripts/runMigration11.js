/* global process */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Pass@123',
    database: process.env.DB_NAME || 'platewise_db',
    multipleStatements: true,
  });

  try {
    console.log('Applying 11_ngo_role_migration.sql...');
    const sqlPath = path.resolve(__dirname, '../../../database/member4/11_ngo_role_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await conn.query(sql);
    console.log('✓ Migration applied successfully.');

    // Verify users.role
    const [userRoleCol] = await conn.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
    console.log('✓ users.role column:', userRoleCol[0]?.Type);

    // Verify donations columns
    const [donCols] = await conn.query('SHOW COLUMNS FROM donations');
    console.log('✓ donations columns:', donCols.map(c => c.Field).join(', '));

    // Safely seed demo NGO account without hardcoding user_id, using bcrypt
    const demoEmail = 'ngo@platewise.org';
    const [existing] = await conn.query('SELECT user_id FROM users WHERE email = ?', [demoEmail]);
    const hash = await bcrypt.hash('Ngo@123', 10);

    if (existing.length > 0) {
      await conn.query(
        'UPDATE users SET full_name = ?, role = ?, account_status = ?, password_hash = ? WHERE email = ?',
        ['Feeding India NGO', 'ngo', 'active', hash, demoEmail]
      );
      console.log(`✓ Updated demo NGO account: ${demoEmail} [ngo] (ID: ${existing[0].user_id})`);
    } else {
      const [insertRes] = await conn.query(
        'INSERT INTO users (full_name, email, role, account_status, password_hash) VALUES (?, ?, ?, ?, ?)',
        ['Feeding India NGO', demoEmail, 'ngo', 'active', hash]
      );
      console.log(`✓ Created demo NGO account: ${demoEmail} [ngo] (ID: ${insertRes.insertId})`);
    }
  } catch (err) {
    console.error('Migration error:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

run();
