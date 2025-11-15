/**
 * Lambda Handler: Get All Products (Public)
 * GET /api/public/catalogo/prodotti
 */

const { getAllProducts } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('GetProducts invoked', {
    requestId: event.requestContext?.requestId,
    queryParams: event.queryStringParameters,
  });

  try {
    // Parse query parameters
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 50;
    const lastEvaluatedKey = event.queryStringParameters?.lastKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : null;

    // Get products from DynamoDB
    const result = await getAllProducts({ limit, lastEvaluatedKey });

    // Build response with pagination metadata
    const metadata = {
      count: result.items.length,
      hasMore: result.hasMore,
    };

    if (result.lastEvaluatedKey) {
      metadata.nextKey = encodeURIComponent(JSON.stringify(result.lastEvaluatedKey));
    }

    return successResponse(HTTP_STATUS.OK, result.items, metadata);
  } catch (error) {
    logError(error, {
      handler: 'getProducts',
      requestId: event.requestContext?.requestId,
    });

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to fetch products'
    );
  }
};
