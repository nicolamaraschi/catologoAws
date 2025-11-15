/**
 * Standardized API response utilities
 * Provides consistent response format across all Lambda functions
 */

const { HTTP_STATUS } = require('../../../config/constants');

/**
 * Create standardized success response
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response data
 * @param {Object} metadata - Optional metadata (pagination, etc.)
 * @returns {Object} API Gateway response object
 */
function successResponse(statusCode = HTTP_STATUS.OK, data = null, metadata = null) {
  const body = {
    success: true,
    data,
  };

  if (metadata) {
    body.metadata = metadata;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} details - Optional error details
 * @returns {Object} API Gateway response object
 */
function errorResponse(statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = 'Internal Server Error', details = null) {
  const body = {
    success: false,
    error: {
      message,
      statusCode,
    },
  };

  if (details) {
    body.error.details = details;
  }

  // Add timestamp for debugging
  body.timestamp = new Date().toISOString();

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create response for paginated data
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination info (page, limit, total, hasMore)
 * @returns {Object} API Gateway response object
 */
function paginatedResponse(items, pagination) {
  return successResponse(HTTP_STATUS.OK, items, {
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 50,
      total: pagination.total || items.length,
      hasMore: pagination.hasMore || false,
    },
  });
}

/**
 * Create response for created resource
 * @param {Object} data - Created resource data
 * @returns {Object} API Gateway response object
 */
function createdResponse(data) {
  return successResponse(HTTP_STATUS.CREATED, data);
}

/**
 * Create response for no content (successful deletion)
 * @returns {Object} API Gateway response object
 */
function noContentResponse() {
  return {
    statusCode: HTTP_STATUS.NO_CONTENT,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: '',
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
};
