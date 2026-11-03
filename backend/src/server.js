/* global process */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import kitchenRoutes from './routes/kitchenRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import cashierRoutes from './routes/cashierRoutes.js';
import ngoRoutes from './routes/ngoRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Enforce JWT_SECRET requirement strictly
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET environment variable is missing or less than 32 characters long.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup supporting credentials with specific origin
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, unit tests, server-to-server) or in allowedOrigins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-demo-role'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: 'ok',
    service: 'PlateWise Member 4 Analytics, Escalations & Auth API',
    database_connected: dbOk,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/ngo', ngoRoutes);

// Global Error Handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Start Server only if directly executed from CLI
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(` PlateWise Backend API running on port ${PORT}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(` Auth Endpoint: http://localhost:${PORT}/api/auth`);
    console.log(`=======================================================`);
    await testConnection();
  });
}

export default app;
