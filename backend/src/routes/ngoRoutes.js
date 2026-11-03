import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole, validateCsrf } from '../middleware/roleMiddleware.js';
import { withTransactionRetry } from '../utils/transactionHelper.js';
import {
  getAvailableDonations,
  getDonationById,
  claimDonation,
  cancelClaim,
  getMyClaims,
} from '../services/donationService.js';

const router = Router();

// NGO endpoints strictly require authentication, 'ngo' or 'admin' role, and CSRF check on mutations
router.use(authenticate);
router.use(requireRole('ngo', 'admin'));
router.use(validateCsrf);

/**
 * GET /api/ngo/overview
 * High-level impact and availability stats for the NGO portal
 */
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 1. Available offers & portions (active and unexpired)
    const [availRows] = await pool.query(
      `SELECT
        COUNT(*) AS available_batches,
        COALESCE(SUM(GREATEST(0, d.quantity - d.claimed_quantity)), 0) AS available_portions
       FROM donations d
       WHERE d.status IN ('Available', 'Partially Collected')
         AND (d.collection_deadline IS NULL OR d.collection_deadline > NOW())
         AND (d.quantity - d.claimed_quantity) > 0`
    );

    // 2. Authenticated NGO's claims: from donation_claims + legacy claims
    const [claimStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_claimed_batches,
        COALESCE(SUM(dc.quantity), 0) AS total_claimed_portions,
        SUM(CASE WHEN dc.status = 'Collected' THEN 1 ELSE 0 END) AS collected_batches,
        COALESCE(SUM(CASE WHEN dc.status = 'Collected' THEN dc.quantity ELSE 0 END), 0) AS collected_portions
       FROM donation_claims dc
       WHERE dc.ngo_id = ? AND dc.status IN ('Claimed', 'Collected')`,
      [userId]
    );

    const [legacyStats] = await pool.query(
      `SELECT
        COUNT(*) AS legacy_batches,
        COALESCE(SUM(d.quantity), 0) AS legacy_portions,
        SUM(CASE WHEN d.status = 'Collected' THEN 1 ELSE 0 END) AS legacy_collected_batches,
        COALESCE(SUM(CASE WHEN d.status = 'Collected' THEN d.quantity ELSE 0 END), 0) AS legacy_collected_portions
       FROM donations d
       WHERE d.claimed_by = ?
         AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = d.donation_id)`,
      [userId]
    );

    const totalClaimedBatches =
      Number(claimStats[0]?.total_claimed_batches || 0) + Number(legacyStats[0]?.legacy_batches || 0);
    const totalClaimedPortions =
      Number(claimStats[0]?.total_claimed_portions || 0) + Number(legacyStats[0]?.legacy_portions || 0);
    const totalCollectedPortions =
      Number(claimStats[0]?.collected_portions || 0) + Number(legacyStats[0]?.legacy_collected_portions || 0);

    // 3. Platform total impact: total portions collected & distributed across campus
    const [platformImpact] = await pool.query(
      `SELECT
        (SELECT COALESCE(SUM(quantity), 0) FROM donation_claims WHERE status = 'Collected') +
        (SELECT COALESCE(SUM(quantity), 0) FROM donations WHERE status IN ('Collected', 'Completed')
           AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = donations.donation_id))
        AS total_platform_donated`
    );

    res.json({
      available_batches: Number(availRows[0]?.available_batches || 0),
      available_portions: Number(availRows[0]?.available_portions || 0),
      my_claimed_batches: totalClaimedBatches,
      my_claimed_portions: totalClaimedPortions,
      my_collected_portions: totalCollectedPortions,
      total_platform_donated: Number(platformImpact[0]?.total_platform_donated || 0),
      ngo_partner_name: req.user.full_name,
    });
  } catch (error) {
    console.error('[API Error] GET /api/ngo/overview:', error);
    res.status(500).json({ error: 'Failed to fetch NGO overview', message: error.message });
  }
});

/**
 * GET /api/ngo/donations
 * Lists surplus food donations available for distribution or filterable by status
 */
router.get('/donations', async (req, res) => {
  try {
    const donations = await getAvailableDonations(pool, req.query);
    res.json(donations);
  } catch (error) {
    console.error('[API Error] GET /api/ngo/donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations', message: error.message });
  }
});

/**
 * GET /api/ngo/donations/my-claims
 * GET /api/ngo/my-claims
 * Returns all active, collected, and past claims for the authenticated NGO
 * NOTE: Must be defined BEFORE /donations/:id to prevent Express route parameter shadowing!
 */
const handleGetMyClaims = async (req, res) => {
  try {
    const claims = await getMyClaims(pool, req.user.user_id);
    res.json(claims);
  } catch (error) {
    console.error('[API Error] GET /api/ngo/my-claims:', error);
    res.status(500).json({ error: 'Failed to fetch NGO claims', message: error.message });
  }
};

router.get('/donations/my-claims', handleGetMyClaims);
router.get('/my-claims', handleGetMyClaims);

/**
 * GET /api/ngo/donations/:id
 * Retrieves full details of a specific donation offer including claim status
 */
router.get('/donations/:id', async (req, res) => {
  const donationId = parseInt(req.params.id, 10);
  if (isNaN(donationId) || donationId <= 0) {
    return res.status(400).json({ error: 'Invalid donation ID' });
  }

  try {
    const donation = await getDonationById(pool, donationId, req.user.user_id);
    if (!donation) {
      return res.status(404).json({ error: `Donation #${donationId} not found` });
    }

    // Attach current NGO's specific claim if any
    const myClaim = donation.claims.find((c) => c.ngo_id === req.user.user_id && c.status === 'Claimed');
    res.json({
      ...donation,
      my_active_claim: myClaim || null,
    });
  } catch (error) {
    console.error(`[API Error] GET /api/ngo/donations/${donationId}:`, error);
    res.status(500).json({ error: 'Failed to fetch donation details', message: error.message });
  }
});

/**
 * POST /api/ngo/donations/:id/claims
 * New partial-quantity donation claim endpoint.
 * Accepts { quantity } in request body.
 */
router.post('/donations/:id/claims', async (req, res) => {
  const donationId = parseInt(req.params.id, 10);
  const { quantity } = req.body;

  if (isNaN(donationId) || donationId <= 0) {
    return res.status(400).json({ error: 'Invalid donation ID' });
  }

  if (quantity === undefined || quantity === null) {
    return res.status(400).json({ error: 'Quantity is required for partial donation claims.' });
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer.' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await claimDonation(conn, {
        donationId,
        ngoUserId: req.user.user_id,
        quantity: parsedQty,
      });
    });

    res.status(201).json({
      success: true,
      message: `Successfully claimed ${result.quantity} portions of ${result.food_name}!`,
      claim: result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/ngo/donations/${donationId}/claims:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to claim donation',
      message: error.message,
    });
  }
});

/**
 * POST /api/ngo/donations/:donationId/claim
 * Backward-compatible claim endpoint.
 * Claims all remaining portions if quantity is not specified, or partial if specified.
 */
router.post('/donations/:donationId/claim', async (req, res) => {
  const donationId = parseInt(req.params.donationId, 10);
  const { quantity } = req.body || {};

  if (isNaN(donationId) || donationId <= 0) {
    return res.status(400).json({ error: 'Invalid donation ID' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await claimDonation(conn, {
        donationId,
        ngoUserId: req.user.user_id,
        quantity: quantity !== undefined ? parseInt(quantity, 10) : null,
      });
    });

    // Format response maintaining exact compatibility with existing tests and clients
    res.json({
      success: true,
      message: `Surplus food donation #${donationId} (${result.quantity} portions) claimed successfully!`,
      donation_id: donationId,
      status: 'Claimed',
      parent_status: result.parent_status,
      claimed_by: req.user.user_id,
      claim_id: result.claim_id,
      verification_code: result.verification_code,
      quantity_claimed: result.quantity,
      remaining_quantity: result.remaining_quantity,
      collection_deadline: result.collection_deadline,
      pickup_location: result.pickup_location,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/ngo/donations/${donationId}/claim:`, error);
    }
    res.status(statusCode).json({
      error: statusCode === 409 ? 'Donation Unavailable' : (error.message || 'Failed to claim donation'),
      message: error.message,
    });
  }
});



/**
 * POST /api/ngo/donation-claims/:claimId/cancel
 * POST /api/ngo/claims/:claimId/cancel
 * Allows an NGO partner to cancel their pending claim before dock pickup.
 * Immediately restores the reserved quantity to the available parent donation pool.
 */
const handleCancelClaim = async (req, res) => {
  const claimId = parseInt(req.params.claimId, 10);
  const { reason } = req.body || {};

  if (isNaN(claimId) || claimId <= 0) {
    return res.status(400).json({ error: 'Invalid claim ID' });
  }

  try {
    const result = await withTransactionRetry(pool, async (conn) => {
      return await cancelClaim(conn, {
        claimId,
        requestingUserId: req.user.user_id,
        requestingRole: req.user.role,
        reason,
      });
    });

    res.json({
      success: true,
      message: `Donation claim #${claimId} cancelled successfully. ${result.released_quantity} portions returned to available pool.`,
      ...result,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      console.error(`[API Error] POST /api/ngo/donation-claims/${claimId}/cancel:`, error);
    }
    res.status(statusCode).json({
      error: error.message || 'Failed to cancel donation claim',
      message: error.message,
    });
  }
};

router.post('/donation-claims/:claimId/cancel', handleCancelClaim);
router.post('/claims/:claimId/cancel', handleCancelClaim);

/**
 * GET /api/ngo/history
 * List history of donations claimed or received by the current NGO (backward compatible)
 */
router.get('/history', async (req, res) => {
  try {
    const claims = await getMyClaims(pool, req.user.user_id);

    // Format response strictly matching existing frontend expectations
    const formatted = claims.map((c) => ({
      donation_id: c.donation_id,
      claim_id: c.claim_id,
      quantity: Number(c.quantity),
      status: c.status === 'Collected' ? 'Collected' : 'Claimed',
      claimed_at: c.claimed_at,
      collected_at: c.collected_at,
      food_name: c.food_name,
      food_category: c.food_category,
      verification_code: c.verification_code,
      pickup_location: c.pickup_location,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[API Error] GET /api/ngo/history:', error);
    res.status(500).json({ error: 'Failed to fetch NGO claim history', message: error.message });
  }
});

/**
 * GET /api/ngo/analytics
 * Real database metrics for NGO impact, collections, cancellations, and timeline
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // 1. Total portions successfully collected (from child claims + legacy)
    const [childCollected] = await pool.query(
      `SELECT
        COALESCE(SUM(quantity), 0) AS total_portions_collected,
        COUNT(*) AS successful_collections_count
       FROM donation_claims
       WHERE ngo_id = ? AND status = 'Collected'`,
      [userId]
    );

    const [legacyCollected] = await pool.query(
      `SELECT
        COALESCE(SUM(quantity), 0) AS legacy_portions_collected,
        COUNT(*) AS legacy_collections_count
       FROM donations
       WHERE claimed_by = ? AND status IN ('Collected', 'Completed')
         AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = donations.donation_id)`,
      [userId]
    );

    const totalCollectedPortions =
      Number(childCollected[0]?.total_portions_collected || 0) +
      Number(legacyCollected[0]?.legacy_portions_collected || 0);

    const successfulCollectionsCount =
      Number(childCollected[0]?.successful_collections_count || 0) +
      Number(legacyCollected[0]?.legacy_collections_count || 0);

    // 2. Active claims & pending portions (status = 'Claimed')
    const [childActive] = await pool.query(
      `SELECT
        COUNT(*) AS active_claims_count,
        COALESCE(SUM(quantity), 0) AS pending_collection_portions
       FROM donation_claims
       WHERE ngo_id = ? AND status = 'Claimed'`,
      [userId]
    );

    const [legacyActive] = await pool.query(
      `SELECT
        COUNT(*) AS legacy_active_count,
        COALESCE(SUM(quantity), 0) AS legacy_pending_portions
       FROM donations
       WHERE claimed_by = ? AND status = 'Claimed'
         AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = donations.donation_id)`,
      [userId]
    );

    const activeClaimsCount =
      Number(childActive[0]?.active_claims_count || 0) + Number(legacyActive[0]?.legacy_active_count || 0);
    const pendingCollectionPortions =
      Number(childActive[0]?.pending_collection_portions || 0) + Number(legacyActive[0]?.legacy_pending_portions || 0);

    // 3. Cancelled claims count
    const [cancelledRows] = await pool.query(
      `SELECT COUNT(*) AS cancelled_claims_count
       FROM donation_claims
       WHERE ngo_id = ? AND status = 'Cancelled'`,
      [userId]
    );

    // 4. Donations received this week (past 7 days)
    const [weekRows] = await pool.query(
      `SELECT
        (SELECT COALESCE(SUM(quantity), 0) FROM donation_claims
         WHERE ngo_id = ? AND status = 'Collected' AND collected_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) +
        (SELECT COALESCE(SUM(quantity), 0) FROM donations
         WHERE claimed_by = ? AND status IN ('Collected', 'Completed') AND claimed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
           AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = donations.donation_id))
        AS collected_this_week`,
      [userId, userId]
    );

    // 5. Donations received this month (past 30 days)
    const [monthRows] = await pool.query(
      `SELECT
        (SELECT COALESCE(SUM(quantity), 0) FROM donation_claims
         WHERE ngo_id = ? AND status = 'Collected' AND collected_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) +
        (SELECT COALESCE(SUM(quantity), 0) FROM donations
         WHERE claimed_by = ? AND status IN ('Collected', 'Completed') AND claimed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = donations.donation_id))
        AS collected_this_month`,
      [userId, userId]
    );

    // 6. 14-Day Collection Trend for simple chart
    const [trendRows] = await pool.query(
      `SELECT
        DATE(collected_time) AS date_str,
        COALESCE(SUM(quantity), 0) AS portions,
        COUNT(*) AS claims
       FROM (
         SELECT collected_at AS collected_time, quantity
         FROM donation_claims
         WHERE ngo_id = ? AND status = 'Collected' AND collected_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
         UNION ALL
         SELECT claimed_at AS collected_time, quantity
         FROM donations
         WHERE claimed_by = ? AND status IN ('Collected', 'Completed') AND claimed_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
           AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = donations.donation_id)
       ) combined
       GROUP BY DATE(collected_time)
       ORDER BY date_str ASC`,
      [userId, userId]
    );

    // Format 14-day chart series
    const chartData = [];
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = istFormatter.format(d);
      const found = trendRows.find((r) => {
        let rowDate = '';
        if (r.date_str instanceof Date) {
          rowDate = istFormatter.format(r.date_str);
        } else if (typeof r.date_str === 'string') {
          rowDate = r.date_str.split('T')[0];
        } else {
          rowDate = String(r.date_str);
        }
        return rowDate === dateKey;
      });
      chartData.push({
        date: dateKey,
        day: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        portions: found ? Number(found.portions) : 0,
        claims: found ? Number(found.claims) : 0,
      });
    }

    res.json({
      total_portions_collected: totalCollectedPortions,
      successful_collections_count: successfulCollectionsCount,
      active_claims_count: activeClaimsCount,
      pending_collection_portions: pendingCollectionPortions,
      cancelled_claims_count: Number(cancelledRows[0]?.cancelled_claims_count || 0),
      collected_this_week: Number(weekRows[0]?.collected_this_week || 0),
      collected_this_month: Number(monthRows[0]?.collected_this_month || 0),
      weight_tracking_note: 'Based on verified canteen meal portions (plates). Raw mass is not estimated without recorded scale data.',
      chart_data: chartData,
    });
  } catch (error) {
    console.error('[API Error] GET /api/ngo/analytics:', error);
    res.status(500).json({ error: 'Failed to fetch NGO analytics', message: error.message });
  }
});

/**
 * GET /api/ngo/notifications
 * Live notifications scoped to the authenticated NGO partner
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const [rows] = await pool.query(
      `SELECT * FROM ngo_notifications
       WHERE (ngo_id = ? OR ngo_id IS NULL)
       ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    const unreadCount = rows.filter((r) => !r.is_read).length;
    res.json({
      notifications: rows,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error('[API Error] GET /api/ngo/notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
  }
});

/**
 * PATCH /api/ngo/notifications/:id/read
 * Mark notification as read
 */
router.patch('/notifications/:id/read', async (req, res) => {
  const notifId = parseInt(req.params.id, 10);
  if (isNaN(notifId) || notifId <= 0) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }
  try {
    await pool.query(
      `UPDATE ngo_notifications SET is_read = 1
       WHERE notification_id = ? AND (ngo_id = ? OR ngo_id IS NULL)`,
      [notifId, req.user.user_id]
    );
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[API Error] PATCH /api/ngo/notifications/:id/read:', error);
    res.status(500).json({ error: 'Failed to update notification', message: error.message });
  }
});

/**
 * POST /api/ngo/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/notifications/mark-all-read', async (req, res) => {
  try {
    await pool.query(
      `UPDATE ngo_notifications SET is_read = 1
       WHERE (ngo_id = ? OR ngo_id IS NULL)`,
      [req.user.user_id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[API Error] POST /api/ngo/notifications/mark-all-read:', error);
    res.status(500).json({ error: 'Failed to mark all as read', message: error.message });
  }
});

/**
 * GET /api/ngo/profile
 * Returns authenticated NGO organization profile
 */
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        user_id, full_name, email, role, account_status,
        organization_name, contact_person, phone_number, address, created_at
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const u = rows[0];
    res.json({
      user_id: u.user_id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      account_status: u.account_status,
      verification_status: u.account_status === 'active' ? 'Verified Relief Partner' : 'Pending Verification',
      organization_name: u.organization_name || u.full_name,
      contact_person: u.contact_person || u.full_name,
      phone_number: u.phone_number || '',
      address: u.address || 'Central Campus District',
      created_at: u.created_at,
    });
  } catch (error) {
    console.error('[API Error] GET /api/ngo/profile:', error);
    res.status(500).json({ error: 'Failed to fetch NGO profile', message: error.message });
  }
});

/**
 * PUT /api/ngo/profile
 * Updates mutable organization contact details with strict RBAC boundary
 */
router.put('/profile', async (req, res) => {
  const { organization_name, contact_person, phone_number, address } = req.body || {};

  // Disallow modifying role, account_status, or email
  if (req.body.role || req.body.account_status || req.body.email) {
    return res.status(403).json({
      error: 'Security Violation',
      message: 'Modification of role, verification status, or primary login email is strictly prohibited.',
    });
  }

  try {
    await pool.query(
      `UPDATE users
       SET organization_name = ?, contact_person = ?, phone_number = ?, address = ?
       WHERE user_id = ?`,
      [
        organization_name?.trim() || null,
        contact_person?.trim() || null,
        phone_number?.trim() || null,
        address?.trim() || null,
        req.user.user_id,
      ]
    );

    const [updated] = await pool.query(
      `SELECT
        user_id, full_name, email, role, account_status,
        organization_name, contact_person, phone_number, address, created_at
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    const u = updated[0];
    res.json({
      success: true,
      message: 'NGO organization profile updated successfully',
      profile: {
        user_id: u.user_id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        account_status: u.account_status,
        verification_status: u.account_status === 'active' ? 'Verified Relief Partner' : 'Pending Verification',
        organization_name: u.organization_name || u.full_name,
        contact_person: u.contact_person || u.full_name,
        phone_number: u.phone_number || '',
        address: u.address || '',
        created_at: u.created_at,
      },
    });
  } catch (error) {
    console.error('[API Error] PUT /api/ngo/profile:', error);
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

export default router;
