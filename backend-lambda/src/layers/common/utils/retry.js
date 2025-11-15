/**
 * Retry logic with exponential backoff
 * Handles transient failures with configurable retry strategy
 */

const { RETRY } = require('../../../config/constants');
const { isRetryableError, logError } = require('./error');

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} initialDelay - Initial delay in ms
 * @param {number} multiplier - Backoff multiplier
 * @param {number} maxDelay - Maximum delay in ms
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(
  attempt,
  initialDelay = RETRY.INITIAL_DELAY_MS,
  multiplier = RETRY.BACKOFF_MULTIPLIER,
  maxDelay = RETRY.MAX_DELAY_MS
) {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Add jitter to delay (randomization to prevent thundering herd)
 * @param {number} delay - Base delay in ms
 * @returns {number} Delay with jitter
 */
function addJitter(delay) {
  // Add random jitter between 0% and 20% of the delay
  const jitter = delay * Math.random() * 0.2;
  return delay + jitter;
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum number of attempts
 * @param {number} options.initialDelay - Initial delay in ms
 * @param {number} options.maxDelay - Maximum delay in ms
 * @param {number} options.multiplier - Backoff multiplier
 * @param {Function} options.shouldRetry - Custom function to determine if error is retryable
 * @param {Object} options.context - Context for logging
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} Last error if all retries fail
 */
async function retryWithBackoff(
  operation,
  options = {}
) {
  const {
    maxAttempts = RETRY.MAX_ATTEMPTS,
    initialDelay = RETRY.INITIAL_DELAY_MS,
    maxDelay = RETRY.MAX_DELAY_MS,
    multiplier = RETRY.BACKOFF_MULTIPLIER,
    shouldRetry = isRetryableError,
    context = {},
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Execute the operation
      const result = await operation();

      // Log successful retry if this wasn't the first attempt
      if (attempt > 0) {
        console.info('Operation succeeded after retry', {
          attempt: attempt + 1,
          ...context,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts - 1;
      const canRetry = shouldRetry(error);

      if (!canRetry || isLastAttempt) {
        logError(error, {
          attempt: attempt + 1,
          maxAttempts,
          retryable: canRetry,
          ...context,
        });
        throw error;
      }

      // Calculate delay with jitter
      const baseDelay = calculateBackoff(attempt, initialDelay, multiplier, maxDelay);
      const delay = addJitter(baseDelay);

      console.warn('Operation failed, retrying...', {
        attempt: attempt + 1,
        maxAttempts,
        delayMs: Math.round(delay),
        error: error.message,
        ...context,
      });

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Wrap a function with retry logic
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function with retry logic
 */
function withRetry(fn, options = {}) {
  return async function(...args) {
    return retryWithBackoff(
      () => fn.apply(this, args),
      {
        ...options,
        context: {
          function: fn.name,
          ...options.context,
        },
      }
    );
  };
}

/**
 * Circuit breaker state
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  /**
   * Execute operation with circuit breaker
   * @param {Function} operation - Async operation to execute
   * @returns {Promise<any>}
   */
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.warn('Circuit breaker opened', {
        failures: this.failures,
        resetTimeout: this.resetTimeout,
      });
    }
  }

  getState() {
    return this.state;
  }
}

module.exports = {
  sleep,
  calculateBackoff,
  addJitter,
  retryWithBackoff,
  withRetry,
  CircuitBreaker,
};
