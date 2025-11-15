/**
 * Lambda Handler: Create Product (Admin)
 * POST /api/admin/prodotti
 * Requires: Cognito Authorization
 */

const { createProduct } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse, createdResponse } = require('../../layers/common/utils/response');
const { logError, ValidationError, ConflictError } = require('../../layers/common/utils/error');
const { validateProductCreation } = require('../../layers/common/utils/validation');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('CreateProduct invoked', {
    requestId: event.requestContext?.requestId,
    userId: event.requestContext?.authorizer?.claims?.sub,
  });

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate input
    const validatedData = validateProductCreation(body);

    // Check user authorization from Cognito
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;

    if (!userId) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    console.info('Product creation requested', {
      codice: validatedData.codice,
      userId,
      userEmail,
    });

    // Create product in DynamoDB
    const product = await createProduct(validatedData);

    console.info('Product created successfully', {
      productId: product.productId,
      codice: product.codice,
      userId,
    });

    return createdResponse(product);
  } catch (error) {
    logError(error, {
      handler: 'createProduct',
      userId: event.requestContext?.authorizer?.claims?.sub,
      requestId: event.requestContext?.requestId,
    });

    if (error instanceof ValidationError) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, error.message, error.details);
    }

    if (error instanceof ConflictError) {
      return errorResponse(HTTP_STATUS.CONFLICT, error.message);
    }

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to create product'
    );
  }
};
