/**
 * Custom error classes and error handling utilities
 * Provides robust error handling with proper logging and categorization
 */

const { HTTP_STATUS, ERRORS } = require('../../../config/constants');

/**
 * Base custom error class
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message = ERRORS.INVALID_INPUT, details = null) {
    super(message, HTTP_STATUS.BAD_REQUEST, details);
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
  constructor(message = ERRORS.PRODUCT_NOT_FOUND) {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

/**
 * Conflict error (409) - e.g., duplicate product code
 */
class ConflictError extends AppError {
  constructor(message = ERRORS.DUPLICATE_CODE) {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

/**
 * Unauthorized error (401)
 */
class UnauthorizedError extends AppError {
  constructor(message = ERRORS.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

/**
 * Service unavailable error (503) - for retryable errors
 */
class ServiceUnavailableError extends AppError {
  constructor(message = ERRORS.SERVICE_UNAVAILABLE) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
}

/**
 * Handle AWS SDK errors and convert to AppError
 * @param {Error} error - AWS SDK error
 * @returns {AppError} Converted error
 */
function handleAWSError(error) {
  console.error('AWS Error:', {
    name: error.name,
    message: error.message,
    code: error.Code || error.code,
    statusCode: error.$metadata?.httpStatusCode,
  });

  // DynamoDB specific errors
  if (error.name === 'ConditionalCheckFailedException') {
    return new ConflictError('Resource already exists or condition failed');
  }

  if (error.name === 'ResourceNotFoundException') {
    return new NotFoundError('Resource not found');
  }

  if (error.name === 'ProvisionedThroughputExceededException' || error.name === 'ThrottlingException') {
    return new ServiceUnavailableError('Service temporarily overloaded, please retry');
  }

  // S3 specific errors
  if (error.Code === 'NoSuchKey' || error.name === 'NoSuchKey') {
    return new NotFoundError('File not found');
  }

  // Default to internal server error
  return new AppError(
    ERRORS.INTERNAL_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'development' ? error.message : null
  );
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context (requestId, userId, etc.)
 */
function logError(error, context = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    ...context,
  };

  // In production, this would integrate with CloudWatch Logs Insights
  if (error.statusCode >= 500) {
    console.error('ERROR:', JSON.stringify(errorLog, null, 2));
  } else {
    console.warn('WARNING:', JSON.stringify(errorLog, null, 2));
  }
}

/**
 * Determine if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  if (error instanceof ServiceUnavailableError) {
    return true;
  }

  // AWS SDK retryable errors
  const retryableErrors = [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'RequestTimeout',
    'ServiceUnavailable',
    'InternalServerError',
  ];

  return retryableErrors.includes(error.name) || retryableErrors.includes(error.Code);
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ServiceUnavailableError,
  handleAWSError,
  logError,
  isRetryableError,
};
