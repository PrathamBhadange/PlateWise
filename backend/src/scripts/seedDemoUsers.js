/* global process */
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const DEMO_USERS = [
  {
    full_name: 'Dr. Ramesh Sharma',
    email: 'admin@platewise.campus',
    role: 'admin',
    password: process.env.DEMO_ADMIN_PASSWORD || 'Admin@123',
  },
  {
    full_name: 'Chef Suresh Kumar',
    email: 'kitchen@platewise.campus',
    role: 'kitchen',
    password: process.env.DEMO_KITCHEN_PASSWORD || 'Kitchen@123',
  },
  {
    full_name: 'Pooja Patil',
    email: 'cashier@platewise.campus',
    role: 'cashier',
    password: process.env.DEMO_CASHIER_PASSWORD || 'Cashier@123',
  },
  {
    full_name: 'Aarav Sharma',
    email: 'aarav.sharma@campus.edu',
    role: 'student',
    password: process.env.DEMO_STUDENT_PASSWORD || 'Student@123',
  },
  {
    full_name: 'Ananya Verma',
    email: 'ananya.verma@campus.edu',
    role: 'student',
    password: process.env.DEMO_STUDENT2_PASSWORD || 'Student@123',
  },
  {
    full_name: 'Feeding India NGO',
    email: 'ngo@platewise.org',
    role: 'ngo',
    password: process.env.DEMO_NGO_PASSWORD || 'Ngo@123',
  },
];

async function seedDemoUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'platewise_root',
    database: process.env.DB_NAME || 'platewise_db',
  });

  try {
    console.log('================================================================================');
    console.log(' PlateWise Demo Users Seeding');
    console.log('================================================================================');

    const SALT_ROUNDS = 10;

    for (const u of DEMO_USERS) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);

      const [existing] = await connection.query(
        'SELECT user_id FROM users WHERE email = ?',
        [u.email]
      );

      if (existing.length > 0) {
        await connection.query(
          'UPDATE users SET password_hash = ?, full_name = ?, role = ?, account_status = "active" WHERE email = ?',
          [hash, u.full_name, u.role, u.email]
        );
        console.log(`  ✓ Updated demo account: ${u.email} [${u.role}] (ID: ${existing[0].user_id})`);
      } else {
        const [result] = await connection.query(
          'INSERT INTO users (full_name, email, role, account_status, password_hash) VALUES (?, ?, ?, "active", ?)',
          [u.full_name, u.email, u.role, hash]
        );
        console.log(`  ✓ Created demo account: ${u.email} [${u.role}] (ID: ${result.insertId})`);
      }
    }

    console.log('--------------------------------------------------------------------------------');
    console.log(' Demo users seeded successfully.');
    console.log('================================================================================');
  } catch (err) {
    console.error('Failed to seed demo users:', err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

seedDemoUsers();
