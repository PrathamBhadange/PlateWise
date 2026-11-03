/**
 * PlateWise Transaction Helper
 * Provides ACID transaction management with bounded retry logic
 * for transient MySQL concurrency errors (1213 Deadlock, 1205 Lock Wait Timeout).
 */

/**
 * Executes a unit of work inside a managed database transaction with exponential
 * backoff and jitter for transient InnoDB lock conflicts.
 *
 * @param {import('mysql2/promise').Pool} pool - MySQL connection pool
 * @param {Function} work - Async callback receiving the transactional connection: (conn) => Promise<T>
 * @param {Object} [options]
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.initialDelayMs=50] - Initial backoff delay in ms
 * @param {number} [options.factor=2] - Exponential multiplier
 * @param {boolean} [options.jitter=true] - Add randomized jitter
 * @returns {Promise<T>} The result returned by the work callback
 */
export async function withTransactionRetry(pool, work, options = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 50,
    factor = 2,
    jitter = true,
  } = options;

  let attempt = 0;
  while (attempt <= maxRetries) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('[TransactionHelper] Error during rollback:', rollbackErr);
      }

      // MySQL error codes:
      // 1213 = ER_LOCK_DEADLOCK
      // 1205 = ER_LOCK_WAIT_TIMEOUT
      const isDeadlock = err.errno === 1213 || err.code === 'ER_LOCK_DEADLOCK';
      const isLockTimeout = err.errno === 1205 || err.code === 'ER_LOCK_WAIT_TIMEOUT';

      if ((isDeadlock || isLockTimeout) && attempt < maxRetries) {
        attempt++;
        const baseDelay = initialDelayMs * Math.pow(factor, attempt - 1);
        const delay = jitter ? baseDelay + Math.floor(Math.random() * baseDelay * 0.5) : baseDelay;
        console.warn(
          `[TransactionHelper] Transient lock conflict (${err.code || err.errno}) on attempt ${attempt}/${maxRetries}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    } finally {
      connection.release();
    }
  }
}
