/**
 * Lambda Handler: Update Product (Admin)
 * PUT /api/admin/prodotti/{productId}
 * Requires: Cognito Authorization
 */

const { updateProduct, getProductById } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError, ValidationError, NotFoundError } = require('../../layers/common/utils/error');
const { validateProductUpdate } = require('../../layers/common/utils/validation');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('UpdateProduct invoked', {
    requestId: event.requestContext?.requestId,
    productId: event.pathParameters?.productId,
    userId: event.requestContext?.authorizer?.claims?.sub,
  });

  try {
    const { productId } = event.pathParameters || {};

    if (!productId) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Product ID is required');
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    body.productId = productId;

    // Validate input
    const validatedData = validateProductUpdate(body);

    // Check user authorization
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;

    if (!userId) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    // Extract updates (remove productId from updates)
    const { productId: _, ...updates } = validatedData;

    console.info('Product update requested', {
      productId,
      updates: Object.keys(updates),
      userId,
      userEmail,
    });

    // Update product in DynamoDB
    const updatedProduct = await updateProduct(productId, updates);

    console.info('Product updated successfully', {
      productId,
      userId,
    });

    return successResponse(HTTP_STATUS.OK, updatedProduct);
  } catch (error) {
    logError(error, {
      handler: 'updateProduct',
      productId: event.pathParameters?.productId,
      userId: event.requestContext?.authorizer?.claims?.sub,
      requestId: event.requestContext?.requestId,
    });

    if (error instanceof ValidationError) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, error.message, error.details);
    }

    if (error instanceof NotFoundError) {
      return errorResponse(HTTP_STATUS.NOT_FOUND, error.message);
    }

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to update product'
    );
  }
};
