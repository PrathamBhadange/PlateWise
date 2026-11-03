/**
 * PlateWise Pay-It-Forward & Sponsorship Configuration
 * Defines subsidized meal pricing parameters, validity windows, and simulated gateway controls.
 */

// Configured canonical unit price per sponsored peer meal credit
// Matches database column default in meal_sponsorships.meal_unit_price (40.00)
export const DEFAULT_MEAL_UNIT_PRICE = 40.0;

// Maximum allowed sponsorship message length
export const MAX_SPONSORSHIP_MESSAGE_LENGTH = 255;

// Default credit validity duration in days
export const DEFAULT_CREDIT_VALIDITY_DAYS = 90;

// Valid payment methods allowed by the payments schema
export const VALID_PAYMENT_METHODS = [
  'cash_on_pickup',
  'upi_simulated',
  'card_simulated',
  'netbanking_simulated',
];

/**
 * Production Safeguard:
 * Determines if simulated payment methods (which do not interact with a real banking gateway)
 * are permitted to succeed. In production, simulated payments are strictly forbidden to
 * prevent unbacked credit minting or fraudulent order completion.
 *
 * @returns {boolean}
 */
export function isSimulatedPaymentAllowed() {
  const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  return env !== 'production';
}
