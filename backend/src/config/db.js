/* global process */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'platewise_root',
  database: process.env.DB_NAME || 'platewise_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  multipleStatements: true,
});

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('[DB] Connected to MySQL database successfully.');
    connection.release();
    return true;
  } catch (error) {
    console.warn('[DB Warning] Could not connect to MySQL:', error.message);
    return false;
  }
}

export default pool;
