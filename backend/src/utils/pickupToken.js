/**
 * Shared Pickup Token Formatter and Parser Utility for PlateWise.
 * Used identically across Kitchen, Cashier, and Student endpoints.
 */

/**
 * Format order ID into a human-friendly campus token (e.g. 42 -> #A-42, 125 -> #B-25).
 * Deterministic: the same order_id always produces the exact same token.
 *
 * @param {number|string} orderId - Numeric order ID
 * @returns {string} Formatted token string (e.g. #A-42, #B-25)
 */
export function formatToken(orderId) {
  const num = parseInt(orderId, 10);
  if (isNaN(num)) return `#${orderId}`;
  const prefixIndex = Math.floor(num / 100) % 26;
  const prefix = String.fromCharCode(65 + prefixIndex);
  const suffix = String(num % 100).padStart(2, '0');
  return `#${prefix}-${suffix}`;
}

/**
 * Extract raw numeric order ID from token string, QR payload, or order number:
 * - Formatted tokens with letter prefix (e.g. "#B-25", "B-25", "#b-25", "b25", "#A-42", "A-42")
 * - Raw numeric IDs (e.g. "125", "#125", "42", "101", "25")
 *
 * @param {string} tokenStr - Raw token string (from input or QR scan)
 * @returns {number|null} Numeric order ID or null if unparseable
 */
export function parseTokenToOrderId(tokenStr) {
  if (!tokenStr) return null;
  let trimmed = String(tokenStr).trim().toUpperCase();
  // Strip optional 'ORDER' or 'ORD' word prefix if present (e.g. "ORDER #125" -> "#125")
  trimmed = trimmed.replace(/^(?:ORDER|ORD)[\s#\-_]*/i, '');

  // 1. Matches formatted token with letter prefix: "#B-25", "B-25", "#B25", "B25", "#A-42", "A-42"
  const letterMatch = trimmed.match(/^#?([A-Z])-?(\d{1,3})$/);
  if (letterMatch) {
    const letter = letterMatch[1];
    const letterIndex = letter.charCodeAt(0) - 65; // A -> 0, B -> 1, ...
    const suffix = parseInt(letterMatch[2], 10);
    return letterIndex * 100 + suffix;
  }

  // 2. Matches raw numeric order ID: "125", "#125", "42", "101", "25"
  const numMatch = trimmed.match(/^#?(\d+)$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}
