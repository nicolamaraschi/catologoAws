/**
 * Lambda Handler: Get Product By ID (Public)
 * GET /api/public/catalogo/prodotti/{productId}
 */

const { getProductById } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError, NotFoundError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('GetProductById invoked', {
    requestId: event.requestContext?.requestId,
    productId: event.pathParameters?.productId,
  });

  try {
    const { productId } = event.pathParameters || {};

    if (!productId) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Product ID is required');
    }

    // Get product from DynamoDB
    const product = await getProductById(productId);

    return successResponse(HTTP_STATUS.OK, product);
  } catch (error) {
    logError(error, {
      handler: 'getProductById',
      productId: event.pathParameters?.productId,
      requestId: event.requestContext?.requestId,
    });

    if (error instanceof NotFoundError) {
      return errorResponse(HTTP_STATUS.NOT_FOUND, error.message);
    }

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to fetch product'
    );
  }
};
