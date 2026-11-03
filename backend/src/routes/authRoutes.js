/* global process */
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { authenticate } from '../middleware/roleMiddleware.js';

const router = Router();

// Constant dummy hash for constant-time comparison when email does not exist
const DUMMY_HASH = '$2b$10$e8w.p84UflqE79wZ7Zf4mOcvfH6c0z2dJ5uS7eZk1Y9F8M3L2P4Qq';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Public registration endpoint.
 * Accepts: full_name, email, password, confirm_password, account_type
 * account_type must be exactly 'student' or 'kitchen'. Any other value, or missing, returns 400.
 * Server-only role mapping:
 *   student -> role='student', account_status='active'
 *   kitchen -> role='kitchen', account_status='pending'
 * Role field from request body is strictly ignored.
 */
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, account_type } = req.body;

    if (!account_type || typeof account_type !== 'string') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Account type is required (must be "student", "kitchen", "cashier", or "ngo")',
      });
    }

    const cleanAccountType = account_type.trim().toLowerCase();
    const validTypes = ['student', 'kitchen', 'cashier', 'ngo'];
    if (!validTypes.includes(cleanAccountType)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid account type. Allowed values are "student", "kitchen", "cashier", or "ngo"',
      });
    }

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ error: 'Validation Error', message: 'Full name is required' });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Validation Error', message: 'A valid email address is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
      });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Passwords do not match',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    // Check for existing user with this email
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Server-enforced role and account status mapping
    let assignedRole = 'student';
    let assignedStatus = 'active';

    if (cleanAccountType === 'kitchen') {
      assignedRole = 'kitchen';
      assignedStatus = 'pending';
    } else if (cleanAccountType === 'cashier') {
      assignedRole = 'cashier';
      assignedStatus = 'pending';
    } else if (cleanAccountType === 'ngo') {
      assignedRole = 'ngo';
      assignedStatus = 'pending';
    }

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, role, account_status, password_hash) VALUES (?, ?, ?, ?, ?)',
      [cleanName, cleanEmail, assignedRole, assignedStatus, passwordHash]
    );

    const newUserId = result.insertId;

    // Student accounts get an active session cookie established immediately
    if (assignedStatus === 'active') {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret || jwtSecret.length < 32) {
        console.error('[Auth Error] JWT_SECRET is missing or invalid');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          user_id: newUserId,
          role: assignedRole,
          email: cleanEmail,
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      const csrfToken = crypto.randomBytes(32).toString('hex');
      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('platewise_auth', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.cookie('csrf_token', csrfToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          user_id: newUserId,
          full_name: cleanName,
          email: cleanEmail,
          role: assignedRole,
          account_status: assignedStatus,
        },
        csrfToken,
      });
    }

    // Staff / NGO registration: pending approval, no session cookie
    const roleLabel = cleanAccountType === 'ngo' ? 'NGO partner' : 'Staff';
    return res.status(201).json({
      message: `${roleLabel} registration submitted successfully. Your account is pending administrator approval before you can log in.`,
      user: {
        user_id: newUserId,
        full_name: cleanName,
        email: cleanEmail,
        role: assignedRole,
        account_status: assignedStatus,
      },
    });
  } catch (error) {
    console.error('[API Error] POST /api/auth/register:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * POST /api/auth/login
 * Database-backed credential verification with timing-attack mitigation.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, login_as } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, role, password_hash, account_status FROM users WHERE email = ?',
      [cleanEmail]
    );

    const user = rows[0];

    // Mitigate user enumeration timing attack: run dummy compare if user does not exist
    if (!user) {
      await bcrypt.compare(String(password), DUMMY_HASH);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Only after password is verified, check account_status
    if (user.account_status === 'pending') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account registration is pending administrator approval. Please wait for an administrator to review your registration.',
        account_status: 'pending',
      });
    }

    if (user.account_status === 'rejected') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account registration has been rejected by the administrator.',
        account_status: 'rejected',
      });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account is not active.',
        account_status: user.account_status,
      });
    }

    // Optional login_as hint check:
    // When login_as is 'admin', user must have role='admin'. Otherwise reject without setting cookie/session.
    const cleanLoginAs = typeof login_as === 'string' ? login_as.trim().toLowerCase() : null;
    if (cleanLoginAs === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'These credentials do not have admin access',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('[Auth Error] JWT_SECRET is missing or invalid');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const isProd = process.env.NODE_ENV === 'production';

    // Set auth cookie (HttpOnly)
    res.cookie('platewise_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Set CSRF token cookie (accessible by JavaScript for double-submit header)
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(200).json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
      },
      csrfToken,
    });
  } catch (error) {
    console.error('[API Error] POST /api/auth/login:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * GET /api/auth/me
 * Restores active session and returns authenticated user details.
 */
router.get('/me', authenticate, async (req, res) => {
  return res.json({
    user: {
      user_id: req.user.user_id,
      full_name: req.user.full_name,
      email: req.user.email,
      role: req.user.role,
      account_status: req.user.account_status,
    },
  });
});

/**
 * POST /api/auth/logout
 * Clears authentication and CSRF cookies.
 */
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('platewise_auth', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  });
  res.clearCookie('csrf_token', {
    httpOnly: false,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
  });

  return res.status(200).json({ message: 'Logged out successfully' });
});

export default router;
