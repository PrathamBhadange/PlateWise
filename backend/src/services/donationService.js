/**
 * PlateWise Donation Management Service
 * Implements Phase 3C.1 Zero-Waste Surplus Food Donation, Partial Claiming,
 * Dual-Horizon Inventory Accounting, and Expiry Management.
 */

import crypto from 'crypto';

/**
 * Calculates accurate dual-horizon stock for a food batch:
 * Physical Stock Remaining = cooked_qty - historical_sold_qty - new_linked_sales - collected_donations - recorded_waste
 * Active Reservations = unclaimed_published_donations + claimed_uncollected_donations
 * Available Stock = Math.max(0, Physical Stock Remaining - Active Reservations)
 *
 * @param {import('mysql2/promise').Connection|import('mysql2/promise').Pool} connOrPool
 * @param {number} foodBatchId
 * @returns {Promise<Object|null>}
 */
export async function calculateBatchStock(connOrPool, foodBatchId) {
  const [batches] = await connOrPool.query(
    `SELECT food_batch_id, menu_item_id, batch_date, cooked_qty, sold_qty, leftover_qty, status
     FROM food_batches WHERE food_batch_id = ?`,
    [foodBatchId]
  );
  if (batches.length === 0) {
    return null;
  }
  const batch = batches[0];
  const cookedQty = Number(batch.cooked_qty) || 0;
  const historicalSoldQty = Number(batch.sold_qty) || 0;

  // 1. New sales linked to this batch from order_items (excluding cancelled orders)
  const [salesRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) AS new_linked_sales
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     WHERE oi.food_batch_id = ? AND o.status != 'Cancelled'`,
    [foodBatchId]
  );
  const newLinkedSales = Number(salesRows[0]?.new_linked_sales) || 0;

  // 1b. Cancelled order items linked to this batch (released back into available stock)
  const [cancelledRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(oi.quantity), 0) AS cancelled_qty
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     WHERE oi.food_batch_id = ? AND o.status = 'Cancelled'`,
    [foodBatchId]
  );
  const cancelledOrdersQty = Number(cancelledRows[0]?.cancelled_qty) || 0;

  // 2. Collected donations (physically departed the kitchen loading dock)
  // From child claims:
  const [collectedClaimsRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(dc.quantity), 0) AS collected_qty
     FROM donation_claims dc
     JOIN donations d ON dc.donation_id = d.donation_id
     WHERE d.food_batch_id = ? AND dc.status = 'Collected'`,
    [foodBatchId]
  );
  // From legacy donations without child claims:
  const [legacyCollectedRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(d.quantity), 0) AS legacy_collected_qty
     FROM donations d
     WHERE d.food_batch_id = ? AND d.status IN ('Collected', 'Completed')
       AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = d.donation_id)`,
    [foodBatchId]
  );
  const collectedDonations = (Number(collectedClaimsRows[0]?.collected_qty) || 0) +
                            (Number(legacyCollectedRows[0]?.legacy_collected_qty) || 0);

  // 3. Recorded waste
  const [wasteRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(quantity), 0) AS recorded_waste
     FROM waste_logs WHERE food_batch_id = ?`,
    [foodBatchId]
  );
  const recordedWaste = Number(wasteRows[0]?.recorded_waste) || 0;

  // Master Physical Stock Equation
  const physicalStockRemaining = Math.max(
    0,
    cookedQty - historicalSoldQty - newLinkedSales - collectedDonations - recordedWaste
  );

  // 4. Active Donation Reservations (committed to donations but still physically in the kitchen)
  // a. Unclaimed portions of active donations: GREATEST(0, d.quantity - d.claimed_quantity)
  const [activeDonationsRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(GREATEST(0, d.quantity - d.claimed_quantity)), 0) AS unclaimed_published
     FROM donations d
     WHERE d.food_batch_id = ?
       AND d.status IN ('Available', 'Partially Collected')
       AND (d.collection_deadline IS NULL OR d.collection_deadline > NOW())`,
    [foodBatchId]
  );
  const unclaimedPublished = Number(activeDonationsRows[0]?.unclaimed_published) || 0;

  // b. Claimed uncollected child claims:
  const [claimedUncollectedRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(dc.quantity), 0) AS claimed_uncollected
     FROM donation_claims dc
     JOIN donations d ON dc.donation_id = d.donation_id
     WHERE d.food_batch_id = ? AND dc.status = 'Claimed'`,
    [foodBatchId]
  );
  // c. Legacy claimed donations without child claims:
  const [legacyClaimedRows] = await connOrPool.query(
    `SELECT COALESCE(SUM(d.quantity), 0) AS legacy_claimed
     FROM donations d
     WHERE d.food_batch_id = ? AND d.status = 'Claimed'
       AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = d.donation_id)`,
    [foodBatchId]
  );
  const claimedUncollected = (Number(claimedUncollectedRows[0]?.claimed_uncollected) || 0) +
                             (Number(legacyClaimedRows[0]?.legacy_claimed) || 0);

  const activeReservations = unclaimedPublished + claimedUncollected;

  // Master Available Stock Equation (Available for allocation to new donations or student sales)
  const availableStock = Math.max(0, physicalStockRemaining - activeReservations);

  return {
    food_batch_id: foodBatchId,
    menu_item_id: batch.menu_item_id,
    cooked_qty: cookedQty,
    historical_sold_qty: historicalSoldQty,
    new_linked_sales: newLinkedSales,
    cancelled_orders_qty: cancelledOrdersQty,
    collected_donations: collectedDonations,
    recorded_waste: recordedWaste,
    physical_stock_remaining: physicalStockRemaining,
    unclaimed_published_reservations: unclaimedPublished,
    claimed_uncollected_reservations: claimedUncollected,
    active_reservations: activeReservations,
    available_stock: availableStock,
  };
}

/**
 * Generates the default donation collection deadline:
 * Daily 18:30 IST cutoff (canteen closing time).
 * If current time is past 18:30 IST, targets tomorrow 18:30 IST.
 *
 * @returns {Date}
 */
export function getDefaultCollectionDeadline() {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = istFormatter.formatToParts(now);
  const partMap = {};
  for (const p of parts) partMap[p.type] = p.value;

  const currentHour = parseInt(partMap.hour, 10);
  const currentMinute = parseInt(partMap.minute, 10);

  const targetDate = new Date(now);
  // If already past 18:30 IST, target tomorrow 18:30 IST
  if (currentHour > 18 || (currentHour === 18 && currentMinute >= 30)) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const istDateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(targetDate);

  return new Date(`${istDateString}T18:30:00+05:30`);
}

/**
 * Generates a unique, high-entropy verification code for dock collection.
 * Format: 'PW-' + 8 uppercase hexadecimal characters.
 *
 * @returns {string}
 */
export function generateVerificationCode() {
  return 'PW-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Creates and publishes a surplus food donation for kitchen staff.
 * Validates available inventory stock, reserves quantities without premature deduction.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.foodBatchId
 * @param {number} params.quantity
 * @param {string|Date} [params.collectionDeadline]
 * @param {number} params.staffUserId
 * @returns {Promise<Object>}
 */
export async function createDonation(conn, { foodBatchId, quantity, collectionDeadline, staffUserId }) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    const error = new Error('Donation quantity must be a positive integer.');
    error.statusCode = 400;
    throw error;
  }

  // Lock the food batch row for update
  const [batches] = await conn.query(
    `SELECT food_batch_id, menu_item_id, status FROM food_batches WHERE food_batch_id = ? FOR UPDATE`,
    [foodBatchId]
  );
  if (batches.length === 0) {
    const error = new Error(`Food batch #${foodBatchId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  // Verify available stock
  const stock = await calculateBatchStock(conn, foodBatchId);
  if (qty > stock.available_stock) {
    const error = new Error(
      `Cannot donate ${qty} portions. Only ${stock.available_stock} portions available for allocation (Physical stock: ${stock.physical_stock_remaining}, Active reservations: ${stock.active_reservations}).`
    );
    error.statusCode = 409;
    throw error;
  }

  let deadline = null;
  if (collectionDeadline) {
    const parsed = new Date(collectionDeadline);
    if (isNaN(parsed.getTime())) {
      const error = new Error('Invalid collection_deadline date format.');
      error.statusCode = 400;
      throw error;
    }
    if (parsed <= new Date()) {
      const error = new Error('Collection deadline must be a future date/time.');
      error.statusCode = 400;
      throw error;
    }
    deadline = parsed;
  } else {
    deadline = getDefaultCollectionDeadline();
  }

  const [res] = await conn.query(
    `INSERT INTO donations (food_batch_id, quantity, claimed_quantity, collection_deadline, status, donated_at)
     VALUES (?, ?, 0, ?, 'Available', NOW())`,
    [foodBatchId, qty, deadline]
  );

  const donationId = res.insertId;

  // Mark batch Surplus if currently Active
  if (batches[0].status === 'Active') {
    await conn.query(
      `UPDATE food_batches SET status = 'Surplus' WHERE food_batch_id = ?`,
      [foodBatchId]
    );
  }

  const [rows] = await conn.query(
    `SELECT d.*, m.name AS food_name, m.category AS food_category
     FROM donations d
     JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
     JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
     WHERE d.donation_id = ?`,
    [donationId]
  );

  // Notify NGOs about fresh surplus food available
  try {
    await conn.query(
      `INSERT INTO ngo_notifications (ngo_id, type, title, message, related_donation_id)
       VALUES (NULL, 'NEW_DONATION', 'Fresh Surplus Food Available', ?, ?)`,
      [`Kitchen posted ${qty} portions of surplus ${rows[0]?.food_name || 'food'} ready for rescue.`, donationId]
    );
  } catch (notifErr) {
    console.warn('[Notification] Could not insert new donation notification:', notifErr.message);
  }

  return {
    ...rows[0],
    quantity: Number(rows[0].quantity),
    claimed_quantity: Number(rows[0].claimed_quantity),
    remaining_quantity: Number(rows[0].quantity) - Number(rows[0].claimed_quantity),
    available_stock_after: stock.available_stock - qty,
  };
}

/**
 * Claims a specific portion (or all remaining portions) of a donation for an NGO partner.
 * Employs row-level locking on the parent donation to prevent concurrent overclaiming.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.donationId
 * @param {number} params.ngoUserId
 * @param {number} [params.quantity] - If null/undefined, claims all remaining portions
 * @returns {Promise<Object>}
 */
export async function claimDonation(conn, { donationId, ngoUserId, quantity }) {
  // Lock the donation row
  const [donations] = await conn.query(
    `SELECT d.*, fb.menu_item_id, m.name AS food_name
     FROM donations d
     JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
     JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
     WHERE d.donation_id = ? FOR UPDATE`,
    [donationId]
  );

  if (donations.length === 0) {
    const error = new Error(`Donation offer #${donationId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const donation = donations[0];

  // 1. Check expiration
  if (donation.collection_deadline && new Date(donation.collection_deadline).getTime() <= Date.now()) {
    const error = new Error('Collection deadline for this surplus food offer has expired.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Check parent status
  if (!['Available', 'Partially Collected'].includes(donation.status)) {
    const error = new Error(`Donation offer is not available for claiming (Current status: ${donation.status}).`);
    error.statusCode = 409;
    throw error;
  }

  const totalQty = Number(donation.quantity);
  const currentClaimedQty = Number(donation.claimed_quantity) || 0;
  const remainingQty = Math.max(0, totalQty - currentClaimedQty);

  if (remainingQty <= 0) {
    const error = new Error('Donation offer is already fully claimed.');
    error.statusCode = 409;
    throw error;
  }

  // If quantity is omitted or null, claim entire remaining available quantity
  const claimQty = (quantity !== undefined && quantity !== null) ? parseInt(quantity, 10) : remainingQty;
  if (isNaN(claimQty) || claimQty <= 0) {
    const error = new Error('Claim quantity must be a positive integer.');
    error.statusCode = 400;
    throw error;
  }

  if (claimQty > remainingQty) {
    const error = new Error(
      `Cannot claim ${claimQty} portions. Only ${remainingQty} portions remain available.`
    );
    error.statusCode = 409;
    throw error;
  }

  // Generate unique verification code
  let verificationCode = generateVerificationCode();
  let codeUnique = false;
  let codeAttempts = 0;
  while (!codeUnique && codeAttempts < 5) {
    const [existing] = await conn.query(
      `SELECT claim_id FROM donation_claims WHERE verification_code = ?`,
      [verificationCode]
    );
    if (existing.length === 0) {
      codeUnique = true;
    } else {
      verificationCode = generateVerificationCode();
      codeAttempts++;
    }
  }

  // Insert child claim
  const [claimRes] = await conn.query(
    `INSERT INTO donation_claims (donation_id, ngo_id, quantity, verification_code, status, claimed_at)
     VALUES (?, ?, ?, ?, 'Claimed', NOW())`,
    [donationId, ngoUserId, claimQty, verificationCode]
  );
  const claimId = claimRes.insertId;

  // Update parent donation claimed_quantity and status
  const newClaimedTotal = currentClaimedQty + claimQty;
  const newStatus = (newClaimedTotal >= totalQty) ? 'Fully Claimed' : 'Available';

  await conn.query(
    `UPDATE donations
     SET claimed_quantity = ?, status = ?, claimed_by = ?, claimed_at = NOW()
     WHERE donation_id = ?`,
    [newClaimedTotal, newStatus, ngoUserId, donationId]
  );

  // Notify claiming NGO about confirmed claim
  try {
    await conn.query(
      `INSERT INTO ngo_notifications (ngo_id, type, title, message, related_donation_id, related_claim_id)
       VALUES (?, 'CLAIM_CONFIRMED', 'Donation Claim Confirmed', ?, ?, ?)`,
      [
        ngoUserId,
        `Successfully claimed ${claimQty} portions of ${donation.food_name}. Present verification code ${verificationCode} at loading dock.`,
        donationId,
        claimId,
      ]
    );
  } catch (notifErr) {
    console.warn('[Notification] Could not insert claim confirmation notification:', notifErr.message);
  }

  return {
    claim_id: claimId,
    donation_id: donationId,
    ngo_id: ngoUserId,
    quantity: claimQty,
    verification_code: verificationCode,
    status: 'Claimed',
    parent_status: newStatus,
    total_quantity: totalQty,
    claimed_quantity: newClaimedTotal,
    remaining_quantity: Math.max(0, totalQty - newClaimedTotal),
    food_name: donation.food_name,
    collection_deadline: donation.collection_deadline,
    pickup_location: 'Kitchen Rear Loading Dock',
  };
}

/**
 * Cancels an eligible uncollected donation claim by the owning NGO or staff.
 * Safely decrements parent claimed_quantity and restores Available parent status.
 * Idempotent against repeated cancellation requests.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.claimId
 * @param {number} params.requestingUserId
 * @param {string} params.requestingRole
 * @param {string} [params.reason]
 * @returns {Promise<Object>}
 */
export async function cancelClaim(conn, { claimId, requestingUserId, requestingRole, reason }) {
  // Lock the claim row
  const [claims] = await conn.query(
    `SELECT dc.*, d.food_batch_id, d.quantity AS donation_total_qty, d.claimed_quantity, d.collection_deadline, d.status AS donation_status
     FROM donation_claims dc
     JOIN donations d ON dc.donation_id = d.donation_id
     WHERE dc.claim_id = ? FOR UPDATE`,
    [claimId]
  );

  if (claims.length === 0) {
    const error = new Error(`Donation claim #${claimId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const claim = claims[0];

  // RBAC ownership check: only the claiming NGO or admin/kitchen can cancel
  if (claim.ngo_id !== requestingUserId && !['admin', 'kitchen'].includes(requestingRole)) {
    const error = new Error('Access denied: You cannot cancel a claim belonging to another NGO partner.');
    error.statusCode = 403;
    throw error;
  }

  // Status checks
  if (claim.status === 'Cancelled') {
    const error = new Error('This claim has already been cancelled.');
    error.statusCode = 400;
    throw error;
  }

  if (claim.status === 'Collected') {
    const error = new Error('Cannot cancel claim: food portions have already been collected from the kitchen dock.');
    error.statusCode = 400;
    throw error;
  }

  if (claim.status === 'Expired') {
    const error = new Error('Cannot cancel claim: the collection deadline has already expired.');
    error.statusCode = 400;
    throw error;
  }

  // Lock parent donation
  const [donations] = await conn.query(
    `SELECT donation_id, quantity, claimed_quantity, collection_deadline, status
     FROM donations WHERE donation_id = ? FOR UPDATE`,
    [claim.donation_id]
  );
  const donation = donations[0];

  // Mark claim cancelled
  const cancelReason = reason || 'Cancelled by NGO partner';
  await conn.query(
    `UPDATE donation_claims
     SET status = 'Cancelled', cancellation_reason = ?, cancelled_at = NOW()
     WHERE claim_id = ?`,
    [cancelReason, claimId]
  );

  // Decrement parent claimed_quantity exactly once
  const currentClaimed = Number(donation.claimed_quantity) || 0;
  const newClaimedTotal = Math.max(0, currentClaimed - Number(claim.quantity));

  // Determine parent status
  let newDonationStatus = donation.status;
  const isDeadlinePassed = donation.collection_deadline && new Date(donation.collection_deadline) <= new Date();

  if (isDeadlinePassed) {
    newDonationStatus = 'Expired';
  } else if (donation.status !== 'Revoked') {
    newDonationStatus = (newClaimedTotal < Number(donation.quantity)) ? 'Available' : 'Fully Claimed';
  }

  await conn.query(
    `UPDATE donations
     SET claimed_quantity = ?, status = ?
     WHERE donation_id = ?`,
    [newClaimedTotal, newDonationStatus, claim.donation_id]
  );

  // Notify NGO about claim cancellation
  try {
    await conn.query(
      `INSERT INTO ngo_notifications (ngo_id, type, title, message, related_donation_id, related_claim_id)
       VALUES (?, 'CLAIM_CANCELLED', 'Donation Claim Cancelled', ?, ?, ?)`,
      [
        claim.ngo_id,
        `Donation claim #${claimId} (${claim.quantity} portions) was cancelled. Portions released back to surplus pool.`,
        claim.donation_id,
        claimId,
      ]
    );
  } catch (notifErr) {
    console.warn('[Notification] Could not insert claim cancellation notification:', notifErr.message);
  }

  return {
    claim_id: claimId,
    donation_id: claim.donation_id,
    released_quantity: Number(claim.quantity),
    new_claimed_quantity: newClaimedTotal,
    new_donation_status: newDonationStatus,
    status: 'Cancelled',
  };
}

/**
 * Revokes an active donation offer.
 * Cancels any pending uncollected claims and restores available stock for the batch.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {number} params.donationId
 * @param {number} params.staffUserId
 * @param {string} [params.reason]
 * @returns {Promise<Object>}
 */
export async function revokeDonation(conn, { donationId, staffUserId, reason }) {
  const [donations] = await conn.query(
    `SELECT donation_id, food_batch_id, quantity, claimed_quantity, status
     FROM donations WHERE donation_id = ? FOR UPDATE`,
    [donationId]
  );

  if (donations.length === 0) {
    const error = new Error(`Donation #${donationId} not found.`);
    error.statusCode = 404;
    throw error;
  }

  const donation = donations[0];

  if (donation.status === 'Revoked') {
    const error = new Error('Donation offer is already revoked.');
    error.statusCode = 400;
    throw error;
  }

  if (['Completed', 'Collected'].includes(donation.status)) {
    const error = new Error('Cannot revoke a completed or collected donation.');
    error.statusCode = 400;
    throw error;
  }

  // Cancel any active uncollected claims
  const [activeClaims] = await conn.query(
    `SELECT claim_id, quantity FROM donation_claims WHERE donation_id = ? AND status = 'Claimed' FOR UPDATE`,
    [donationId]
  );

  const revokeReason = reason || 'Donation offer revoked by kitchen staff';
  if (activeClaims.length > 0) {
    await conn.query(
      `UPDATE donation_claims
       SET status = 'Cancelled', cancellation_reason = ?, cancelled_at = NOW()
       WHERE donation_id = ? AND status = 'Claimed'`,
      [revokeReason, donationId]
    );
  }

  await conn.query(
    `UPDATE donations SET status = 'Revoked' WHERE donation_id = ?`,
    [donationId]
  );

  return {
    donation_id: donationId,
    status: 'Revoked',
    cancelled_claims_count: activeClaims.length,
    released_quantity: Number(donation.quantity),
  };
}

/**
 * Handover at kitchen loading dock: marks a verified claim as Collected.
 * Physically deducts inventory from the kitchen on-hand balance.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {Object} params
 * @param {string} params.verificationCode
 * @param {number} params.staffUserId
 * @returns {Promise<Object>}
 */
export async function collectClaim(conn, { verificationCode, staffUserId }) {
  if (!verificationCode) {
    const error = new Error('Verification code is required.');
    error.statusCode = 400;
    throw error;
  }

  const [claims] = await conn.query(
    `SELECT dc.*, d.food_batch_id, d.quantity AS total_donation_qty
     FROM donation_claims dc
     JOIN donations d ON dc.donation_id = d.donation_id
     WHERE dc.verification_code = ? FOR UPDATE`,
    [verificationCode.trim()]
  );

  if (claims.length === 0) {
    const error = new Error(`Invalid verification code "${verificationCode}".`);
    error.statusCode = 404;
    throw error;
  }

  const claim = claims[0];

  if (claim.status === 'Collected') {
    const error = new Error('This donation claim has already been collected.');
    error.statusCode = 400;
    throw error;
  }

  if (claim.status === 'Cancelled') {
    const error = new Error('Cannot handover: this donation claim was cancelled.');
    error.statusCode = 400;
    throw error;
  }

  if (claim.status === 'Expired') {
    const error = new Error('Cannot handover: this donation claim has expired.');
    error.statusCode = 400;
    throw error;
  }

  // Update claim to Collected
  await conn.query(
    `UPDATE donation_claims SET status = 'Collected', collected_at = NOW() WHERE claim_id = ?`,
    [claim.claim_id]
  );

  // Lock and evaluate parent donation
  const [donations] = await conn.query(
    `SELECT donation_id, quantity FROM donations WHERE donation_id = ? FOR UPDATE`,
    [claim.donation_id]
  );
  const donation = donations[0];

  const [allClaims] = await conn.query(
    `SELECT status, quantity FROM donation_claims WHERE donation_id = ?`,
    [claim.donation_id]
  );

  const collectedCount = allClaims
    .filter((c) => c.status === 'Collected')
    .reduce((sum, c) => sum + Number(c.quantity), 0);

  let newParentStatus = 'Partially Collected';
  if (collectedCount >= Number(donation.quantity)) {
    newParentStatus = 'Completed';
  }

  await conn.query(
    `UPDATE donations SET status = ? WHERE donation_id = ?`,
    [newParentStatus, claim.donation_id]
  );

  // Notify NGO about successful dock handover
  try {
    await conn.query(
      `INSERT INTO ngo_notifications (ngo_id, type, title, message, related_donation_id, related_claim_id)
       VALUES (?, 'HANDOVER_COMPLETED', 'Food Handover Completed', ?, ?, ?)`,
      [
        claim.ngo_id,
        `Kitchen verified and completed handover of ${claim.quantity} portions of food at the loading dock. Thank you for your partnership!`,
        claim.donation_id,
        claim.claim_id,
      ]
    );
  } catch (notifErr) {
    console.warn('[Notification] Could not insert handover completion notification:', notifErr.message);
  }

  return {
    claim_id: claim.claim_id,
    donation_id: claim.donation_id,
    quantity: Number(claim.quantity),
    status: 'Collected',
    parent_donation_status: newParentStatus,
  };
}

/**
 * Identifies expired donations past collection_deadline, expires pending claims,
 * releases reservations, and logs uncollected food to waste_logs idempotently.
 *
 * @param {import('mysql2/promise').Connection} conn
 * @param {number} [staffUserId]
 * @returns {Promise<Object>}
 */
export async function processExpiredDonations(conn, staffUserId = null) {
  const [expiredDonations] = await conn.query(
    `SELECT donation_id, food_batch_id, quantity, claimed_quantity, collection_deadline, status
     FROM donations
     WHERE collection_deadline IS NOT NULL
       AND collection_deadline <= NOW()
       AND status NOT IN ('Completed', 'Collected', 'Expired', 'Revoked')
     FOR UPDATE`
  );

  const results = {
    expired_donations_count: expiredDonations.length,
    expired_claims_count: 0,
    waste_logs_created: 0,
    total_waste_portions: 0,
  };

  for (const donation of expiredDonations) {
    // 1. Process uncollected child claims
    const [uncollectedClaims] = await conn.query(
      `SELECT claim_id, ngo_id, quantity, verification_code
       FROM donation_claims
       WHERE donation_id = ? AND status = 'Claimed'
       FOR UPDATE`,
      [donation.donation_id]
    );

    for (const claim of uncollectedClaims) {
      await conn.query(
        `UPDATE donation_claims SET status = 'Expired' WHERE claim_id = ?`,
        [claim.claim_id]
      );
      results.expired_claims_count++;

      const claimReason = `Donation #${donation.donation_id} Claim #${claim.claim_id} expired uncollected (${claim.quantity} portions)`;
      const [existingWaste] = await conn.query(
        `SELECT waste_log_id FROM waste_logs WHERE food_batch_id = ? AND category = 'Expired_Uncollected' AND reason = ?`,
        [donation.food_batch_id, claimReason]
      );

      if (existingWaste.length === 0) {
        await conn.query(
          `INSERT INTO waste_logs (food_batch_id, quantity, category, logged_by, reason, logged_at)
           VALUES (?, ?, 'Expired_Uncollected', ?, ?, NOW())`,
          [donation.food_batch_id, claim.quantity, staffUserId, claimReason]
        );
        results.waste_logs_created++;
        results.total_waste_portions += Number(claim.quantity);
      }
    }

    // 2. Process unclaimed portions
    const unclaimedQty = Math.max(0, Number(donation.quantity) - Number(donation.claimed_quantity));
    if (unclaimedQty > 0) {
      const unclaimedReason = `Donation #${donation.donation_id} expired unclaimed (${unclaimedQty} portions)`;
      const [existingUnclaimedWaste] = await conn.query(
        `SELECT waste_log_id FROM waste_logs WHERE food_batch_id = ? AND category = 'Expired_Unclaimed' AND reason = ?`,
        [donation.food_batch_id, unclaimedReason]
      );

      if (existingUnclaimedWaste.length === 0) {
        await conn.query(
          `INSERT INTO waste_logs (food_batch_id, quantity, category, logged_by, reason, logged_at)
           VALUES (?, ?, 'Expired_Unclaimed', ?, ?, NOW())`,
          [donation.food_batch_id, unclaimedQty, staffUserId, unclaimedReason]
        );
        results.waste_logs_created++;
        results.total_waste_portions += unclaimedQty;
      }
    }

    // 3. Mark parent donation Expired
    await conn.query(
      `UPDATE donations SET status = 'Expired' WHERE donation_id = ?`,
      [donation.donation_id]
    );
  }

  return results;
}

/**
 * Fetches available surplus food donations for NGO browsing.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Object} [filters]
 * @returns {Promise<Array>}
 */
export async function getAvailableDonations(pool, filters = {}) {
  const {
    status = 'all',
    category,
    min_quantity,
    urgent_only,
    newly_published,
    limit = 50,
  } = filters;

  let query = `
    SELECT
      d.donation_id,
      d.food_batch_id,
      d.quantity AS total_quantity,
      d.claimed_quantity,
      GREATEST(0, d.quantity - d.claimed_quantity) AS remaining_quantity,
      d.collection_deadline,
      d.status,
      d.donated_at,
      d.claimed_by,
      u.full_name AS claimed_by_name,
      fb.menu_item_id,
      fb.batch_date,
      fb.meal_session,
      fb.batch_code,
      fb.cooked_qty AS original_prepared_qty,
      fb.sold_qty,
      fb.notes AS batch_notes,
      fb.created_at AS prepared_at,
      m.name AS food_name,
      m.category AS food_category,
      'Kitchen Rear Loading Dock' AS pickup_location
    FROM donations d
    JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
    JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
    LEFT JOIN users u ON d.claimed_by = u.user_id
  `;

  const params = [];
  const whereClauses = [];

  if (status && status !== 'all') {
    whereClauses.push(`d.status = ?`);
    params.push(status);
  }

  if (category && category !== 'all') {
    whereClauses.push(`m.category = ?`);
    params.push(category);
  }

  if (min_quantity && !isNaN(parseInt(min_quantity, 10))) {
    whereClauses.push(`GREATEST(0, d.quantity - d.claimed_quantity) >= ?`);
    params.push(parseInt(min_quantity, 10));
  }

  if (newly_published === 'true' || newly_published === true) {
    whereClauses.push(`d.donated_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)`);
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ` + whereClauses.join(' AND ');
  }

  query += ` ORDER BY d.donated_at DESC, d.donation_id DESC LIMIT ?`;
  params.push(Number(limit) || 50);

  const [rows] = await pool.query(query, params);

  const mapped = rows.map((r) => {
    const deadline = r.collection_deadline
      ? new Date(r.collection_deadline).toISOString()
      : new Date(new Date(r.donated_at).getTime() + 4 * 60 * 60 * 1000).toISOString();

    const remainingMs = Math.max(0, new Date(deadline).getTime() - Date.now());
    const isUrgent = remainingMs > 0 && remainingMs <= 2 * 60 * 60 * 1000;

    const isAvailable =
      ['Available', 'Partially Collected'].includes(r.status) &&
      Number(r.remaining_quantity) > 0 &&
      (!r.collection_deadline || new Date(r.collection_deadline) > new Date());

    return {
      donation_id: r.donation_id,
      food_batch_id: r.food_batch_id,
      food_name: r.food_name,
      category: r.food_category,
      dietary_type: 'Pure Vegetarian',
      quantity: Number(r.total_quantity), // backward compatible with frontend
      total_quantity: Number(r.total_quantity),
      claimed_quantity: Number(r.claimed_quantity),
      remaining_quantity: Number(r.remaining_quantity),
      original_prepared_qty: Number(r.original_prepared_qty || 0),
      batch_date: r.batch_date,
      batch_code: r.batch_code || `BATCH-${r.food_batch_id}`,
      meal_session: r.meal_session || 'Lunch',
      batch_notes: r.batch_notes || '',
      status: r.status,
      donated_at: r.donated_at,
      prepared_at: r.prepared_at || r.donated_at,
      collection_deadline: r.collection_deadline,
      expiry_estimate: deadline,
      remaining_time_ms: remainingMs,
      is_urgent: isUrgent,
      pickup_location: r.pickup_location,
      claimed_by: r.claimed_by,
      claimed_by_name: r.claimed_by_name,
      is_available_to_claim: isAvailable,
    };
  });

  if (urgent_only === 'true' || urgent_only === true) {
    return mapped.filter((item) => item.is_urgent && item.is_available_to_claim);
  }

  return mapped;
}

/**
 * Fetches donation details and all associated child claims.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} donationId
 * @returns {Promise<Object|null>}
 */
export async function getDonationById(pool, donationId, requestingNgoUserId = null) {
  const [rows] = await pool.query(
    `SELECT
      d.donation_id,
      d.food_batch_id,
      d.quantity AS total_quantity,
      d.claimed_quantity,
      GREATEST(0, d.quantity - d.claimed_quantity) AS remaining_quantity,
      d.collection_deadline,
      d.status,
      d.donated_at,
      d.claimed_by,
      fb.menu_item_id,
      fb.batch_date,
      fb.cooked_qty,
      fb.sold_qty,
      m.name AS food_name,
      m.category AS food_category,
      'Kitchen Rear Loading Dock' AS pickup_location
     FROM donations d
     JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
     JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
     WHERE d.donation_id = ?`,
    [donationId]
  );

  if (rows.length === 0) return null;
  const d = rows[0];

  const [claims] = await pool.query(
    `SELECT
      dc.claim_id,
      dc.ngo_id,
      dc.quantity,
      dc.verification_code,
      dc.status,
      dc.cancellation_reason,
      dc.claimed_at,
      dc.collected_at,
      dc.cancelled_at,
      u.full_name AS ngo_name,
      u.email AS ngo_email
     FROM donation_claims dc
     JOIN users u ON dc.ngo_id = u.user_id
     WHERE dc.donation_id = ?
     ORDER BY dc.claimed_at ASC`,
    [donationId]
  );

  // If requested by an NGO, enforce strict data isolation:
  // Never expose another NGO's private claims, verification codes, or contact emails
  const sanitizedClaims = claims
    .filter((c) => (requestingNgoUserId ? c.ngo_id === requestingNgoUserId : true))
    .map((c) => ({
      claim_id: c.claim_id,
      ngo_id: c.ngo_id,
      ngo_name: c.ngo_name,
      ngo_email: c.ngo_email,
      quantity: Number(c.quantity),
      verification_code: c.verification_code,
      status: c.status,
      cancellation_reason: c.cancellation_reason,
      claimed_at: c.claimed_at,
      collected_at: c.collected_at,
      cancelled_at: c.cancelled_at,
    }));

  return {
    donation_id: d.donation_id,
    food_batch_id: d.food_batch_id,
    food_name: d.food_name,
    category: d.food_category,
    total_quantity: Number(d.total_quantity),
    claimed_quantity: Number(d.claimed_quantity),
    remaining_quantity: Number(d.remaining_quantity),
    collection_deadline: d.collection_deadline,
    status: d.status,
    donated_at: d.donated_at,
    pickup_location: d.pickup_location,
    claims: sanitizedClaims,
  };
}

/**
 * Retrieves all claims made by the authenticated NGO partner.
 * Handles both new child claims and historical legacy claims.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} ngoUserId
 * @returns {Promise<Array>}
 */
export async function getMyClaims(pool, ngoUserId) {
  // 1. Child claims
  const [claimRows] = await pool.query(
    `SELECT
      dc.claim_id,
      dc.donation_id,
      dc.ngo_id,
      dc.quantity,
      dc.verification_code,
      dc.status,
      dc.cancellation_reason,
      dc.claimed_at,
      dc.collected_at,
      dc.cancelled_at,
      d.collection_deadline,
      d.status AS parent_donation_status,
      fb.food_batch_id,
      fb.batch_date,
      fb.meal_session,
      fb.batch_code,
      fb.cooked_qty AS original_prepared_qty,
      fb.notes AS batch_notes,
      m.menu_item_id,
      m.name AS food_name,
      m.category AS food_category,
      'Kitchen Rear Loading Dock' AS pickup_location
     FROM donation_claims dc
     JOIN donations d ON dc.donation_id = d.donation_id
     JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
     JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
     WHERE dc.ngo_id = ?
     ORDER BY dc.claimed_at DESC`,
    [ngoUserId]
  );

  // 2. Legacy claims where d.claimed_by = ? and no rows in donation_claims
  const [legacyRows] = await pool.query(
    `SELECT
      d.donation_id,
      d.quantity,
      d.status,
      d.claimed_at,
      d.donated_at,
      d.collection_deadline,
      fb.food_batch_id,
      fb.batch_date,
      fb.meal_session,
      fb.batch_code,
      fb.cooked_qty AS original_prepared_qty,
      fb.notes AS batch_notes,
      m.menu_item_id,
      m.name AS food_name,
      m.category AS food_category,
      'Kitchen Rear Loading Dock' AS pickup_location
     FROM donations d
     JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
     JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
     WHERE d.claimed_by = ?
       AND NOT EXISTS (SELECT 1 FROM donation_claims dc WHERE dc.donation_id = d.donation_id)
     ORDER BY d.claimed_at DESC`,
    [ngoUserId]
  );

  const formatClaim = (c, isLegacy = false) => {
    const qty = Number(c.quantity);
    const deadline = c.collection_deadline ? new Date(c.collection_deadline) : null;
    const isExpired = deadline && deadline <= new Date() && c.status === 'Claimed';
    const effectiveStatus = isExpired ? 'Expired' : c.status;
    const canCancel = effectiveStatus === 'Claimed' && (!deadline || deadline > new Date());
    const remainingMs = deadline ? Math.max(0, deadline.getTime() - Date.now()) : null;
    const isUrgent = effectiveStatus === 'Claimed' && remainingMs !== null && remainingMs > 0 && remainingMs <= 2 * 60 * 60 * 1000;

    let progressStep = 2; // Default Claim Confirmed / Ready for Pickup
    let progressLabel = 'Awaiting Collection at Loading Dock';

    if (effectiveStatus === 'Collected') {
      progressStep = 3;
      progressLabel = 'Collection Completed & Distributed';
    } else if (effectiveStatus === 'Cancelled') {
      progressStep = -1;
      progressLabel = 'Claim Cancelled';
    } else if (effectiveStatus === 'Expired') {
      progressStep = -2;
      progressLabel = 'Collection Window Expired';
    }

    return {
      claim_id: isLegacy ? null : c.claim_id,
      donation_id: c.donation_id,
      ngo_id: ngoUserId,
      quantity: qty,
      verification_code: c.verification_code,
      status: effectiveStatus,
      raw_status: c.status,
      cancellation_reason: c.cancellation_reason || null,
      claimed_at: c.claimed_at,
      collected_at: c.collected_at || (effectiveStatus === 'Collected' ? c.claimed_at : null),
      cancelled_at: c.cancelled_at || null,
      collection_deadline: c.collection_deadline,
      parent_donation_status: c.parent_donation_status,
      food_batch_id: c.food_batch_id,
      batch_date: c.batch_date,
      batch_code: c.batch_code || `BATCH-${c.food_batch_id}`,
      meal_session: c.meal_session || 'Lunch',
      original_prepared_qty: Number(c.original_prepared_qty || 0),
      batch_notes: c.batch_notes || '',
      dietary_type: 'Pure Vegetarian',
      menu_item_id: c.menu_item_id,
      food_name: c.food_name,
      category: c.food_category,
      food_category: c.food_category,
      pickup_location: c.pickup_location,
      remaining_time_ms: remainingMs,
      is_urgent: isUrgent,
      can_cancel: canCancel,
      progress_step: progressStep,
      progress_label: progressLabel,
      is_legacy: isLegacy,
    };
  };

  return [
    ...claimRows.map((cr) => formatClaim(cr, false)),
    ...legacyRows.map((lr) => formatClaim(lr, true)),
  ];
}

/**
 * Retrieves all donations for kitchen staff management.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Object} [filters]
 * @returns {Promise<Array>}
 */
export async function getKitchenDonations(pool, filters = {}) {
  const { status, limit = 50 } = filters;

  let query = `
    SELECT
      d.donation_id,
      d.food_batch_id,
      d.quantity AS total_quantity,
      d.claimed_quantity,
      GREATEST(0, d.quantity - d.claimed_quantity) AS remaining_quantity,
      d.collection_deadline,
      d.status,
      d.donated_at,
      fb.menu_item_id,
      fb.batch_date,
      fb.cooked_qty,
      fb.sold_qty,
      m.name AS food_name,
      m.category AS food_category
    FROM donations d
    JOIN food_batches fb ON d.food_batch_id = fb.food_batch_id
    JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
  `;

  const params = [];
  if (status && status !== 'all') {
    query += ` WHERE d.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY d.donated_at DESC, d.donation_id DESC LIMIT ?`;
  params.push(Number(limit) || 50);

  const [donations] = await pool.query(query, params);
  if (donations.length === 0) return [];

  const donationIds = donations.map((d) => d.donation_id);
  const [claims] = await pool.query(
    `SELECT
      dc.claim_id,
      dc.donation_id,
      dc.ngo_id,
      dc.quantity,
      dc.verification_code,
      dc.status,
      dc.claimed_at,
      dc.collected_at,
      dc.cancelled_at,
      u.full_name AS ngo_name,
      u.email AS ngo_email
     FROM donation_claims dc
     JOIN users u ON dc.ngo_id = u.user_id
     WHERE dc.donation_id IN (?)
     ORDER BY dc.claimed_at ASC`,
    [donationIds]
  );

  const claimsByDonationId = {};
  for (const c of claims) {
    if (!claimsByDonationId[c.donation_id]) {
      claimsByDonationId[c.donation_id] = [];
    }
    claimsByDonationId[c.donation_id].push({
      claim_id: c.claim_id,
      ngo_id: c.ngo_id,
      ngo_name: c.ngo_name,
      ngo_email: c.ngo_email,
      quantity: Number(c.quantity),
      verification_code: c.verification_code,
      status: c.status,
      claimed_at: c.claimed_at,
      collected_at: c.collected_at,
      cancelled_at: c.cancelled_at,
    });
  }

  return donations.map((d) => ({
    donation_id: d.donation_id,
    food_batch_id: d.food_batch_id,
    food_name: d.food_name,
    category: d.food_category,
    total_quantity: Number(d.total_quantity),
    claimed_quantity: Number(d.claimed_quantity),
    remaining_quantity: Number(d.remaining_quantity),
    collection_deadline: d.collection_deadline,
    status: d.status,
    donated_at: d.donated_at,
    claims: claimsByDonationId[d.donation_id] || [],
  }));
}

/**
 * Retrieves batches with positive available stock for donation allocation.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @returns {Promise<Array>}
 */
export async function getAvailableBatches(pool) {
  const [batches] = await pool.query(
    `SELECT fb.food_batch_id, fb.menu_item_id, fb.batch_date, fb.cooked_qty, fb.sold_qty, fb.leftover_qty, fb.status,
            m.name AS food_name, m.category AS food_category, m.price
     FROM food_batches fb
     JOIN menu_items m ON fb.menu_item_id = m.menu_item_id
     WHERE fb.status IN ('Active', 'Surplus')
     ORDER BY fb.batch_date DESC, fb.food_batch_id DESC`
  );

  const results = [];
  for (const b of batches) {
    const stock = await calculateBatchStock(pool, b.food_batch_id);
    if (stock && stock.available_stock > 0) {
      results.push({
        food_batch_id: b.food_batch_id,
        menu_item_id: b.menu_item_id,
        food_name: b.food_name,
        category: b.food_category,
        batch_date: b.batch_date,
        price: b.price,
        cooked_qty: stock.cooked_qty,
        physical_stock_remaining: stock.physical_stock_remaining,
        active_reservations: stock.active_reservations,
        available_stock: stock.available_stock,
      });
    }
  }

  return results;
}
