/* global process */
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

/**
 * Authentication middleware.
 * Verifies JWT from HttpOnly cookie `platewise_auth` or Authorization Bearer header.
 * Re-queries the database to confirm user existence and active role.
 * Never trusts x-demo-role header.
 */
export async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.platewise_auth) {
      token = req.cookies.platewise_auth;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('[Auth Error] JWT_SECRET is missing or shorter than 32 characters');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
      });
    }

    // Always fetch latest user record from MySQL to ensure role, status & identity are current
    const [rows] = await pool.query(
      'SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = ?',
      [decoded.user_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account no longer exists',
      });
    }

    // Verify account status: pending or rejected accounts immediately lose access
    if (rows[0].account_status !== 'active') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Account is ${rows[0].account_status}. Access denied.`,
        account_status: rows[0].account_status,
      });
    }

    req.user = rows[0];
    req.userRole = rows[0].role;

    // Prevent caching of authenticated responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

/**
 * Role-based authorization middleware.
 * Ensures req.user has one of the allowed roles.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before checking role',
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${userRole}' is not authorized to access this resource. Required roles: ${allowedRoles.join(', ')}`,
        currentRole: userRole,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}

// Alias for backwards compatibility with existing route declarations
export const checkRole = requireRole;

/**
 * Double-submit cookie CSRF validation middleware.
 * Required for state-changing HTTP methods (POST, PUT, PATCH, DELETE).
 * Compares X-CSRF-Token header with csrf_token cookie.
 */
export function validateCsrf(req, res, next) {
  const method = req.method.toUpperCase();
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (safeMethods.includes(method)) {
    return next();
  }

  // Exempt public auth endpoints from CSRF check (login/register establish new session)
  const exemptPaths = ['/api/auth/login', '/api/auth/register'];
  if (exemptPaths.some((p) => req.originalUrl && req.originalUrl.startsWith(p))) {
    return next();
  }

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or missing CSRF token',
    });
  }

  next();
}
