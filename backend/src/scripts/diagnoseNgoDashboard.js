/* global process */
import pool from '../config/db.js';

async function diagnose() {
  const [db] = await pool.query('SELECT DATABASE() AS current_db');
  console.log('Current DB:', db[0].current_db);

  for (const userId of [61, 73]) {
    const [u] = await pool.query('SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = ?', [userId]);
    console.log('\n============================================================');
    console.log(`DIAGNOSTIC FOR USER ${userId}: ${u[0]?.email} (${u[0]?.full_name})`);
    console.log('============================================================');

    // 1. Overview Query
    const [availRows] = await pool.query(
      `SELECT
        COUNT(*) AS available_batches,
        COALESCE(SUM(GREATEST(0, d.quantity - d.claimed_quantity)), 0) AS available_portions
       FROM donations d
       WHERE d.status IN ('Available', 'Partially Collected')
         AND (d.collection_deadline IS NULL OR d.collection_deadline > NOW())
         AND (d.quantity - d.claimed_quantity) > 0`
    );

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

    console.log('--- Overview API Results ---');
    console.log('Available Batches:', availRows[0].available_batches);
    console.log('Available Portions:', availRows[0].available_portions);
    console.log('Claim Stats (donation_claims):', claimStats[0]);
    console.log('Legacy Stats (donations table):', legacyStats[0]);

    // 2. Analytics Query
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

    const [activeClaimsRows] = await pool.query(
      `SELECT
        COUNT(*) AS active_claims_count,
        COALESCE(SUM(quantity), 0) AS pending_collection_portions
       FROM donation_claims
       WHERE ngo_id = ? AND status = 'Claimed'`,
      [userId]
    );

    const [cancelledRows] = await pool.query(
      `SELECT COUNT(*) AS cancelled_claims_count
       FROM donation_claims
       WHERE ngo_id = ? AND status = 'Cancelled'`,
      [userId]
    );

    console.log('\n--- Analytics API Results ---');
    console.log('Child Collected:', childCollected[0]);
    console.log('Legacy Collected:', legacyCollected[0]);
    console.log('Active Claims:', activeClaimsRows[0]);
    console.log('Cancelled Claims:', cancelledRows[0]);

    // 3. Claims in donation_claims
    const [rawClaims] = await pool.query(
      `SELECT claim_id, donation_id, quantity, status, verification_code, claimed_at, collected_at, cancelled_at
       FROM donation_claims WHERE ngo_id = ?`,
      [userId]
    );
    console.log('\n--- donation_claims rows for this user ---');
    console.log(rawClaims);

    // 4. Claims in donations table directly (legacy)
    const [rawLegacy] = await pool.query(
      `SELECT donation_id, quantity, claimed_quantity, status, collection_deadline, claimed_by, claimed_at
       FROM donations WHERE claimed_by = ?`,
      [userId]
    );
    console.log('\n--- legacy donations rows for this user ---');
    console.log(rawLegacy);
  }

  await pool.end();
}

diagnose();
