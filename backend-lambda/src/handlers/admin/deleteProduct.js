/**
 * Lambda Handler: Delete Product (Admin)
 * DELETE /api/admin/prodotti/{productId}
 * Requires: Cognito Authorization
 */

const { deleteProduct, getProductById } = require('../../layers/common/services/dynamodb');
const { deleteMultipleFiles, extractFileKeyFromUrl } = require('../../layers/common/services/s3');
const { noContentResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError, NotFoundError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('DeleteProduct invoked', {
    requestId: event.requestContext?.requestId,
    productId: event.pathParameters?.productId,
    userId: event.requestContext?.authorizer?.claims?.sub,
  });

  try {
    const { productId } = event.pathParameters || {};

    if (!productId) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Product ID is required');
    }

    // Check user authorization
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;

    if (!userId) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    console.info('Product deletion requested', {
      productId,
      userId,
      userEmail,
    });

    // Get product first to retrieve image URLs
    const product = await getProductById(productId);

    // Delete product from DynamoDB
    await deleteProduct(productId);

    // Delete associated images from S3 (non-blocking)
    if (product.immagini && product.immagini.length > 0) {
      const imageKeys = product.immagini
        .map((url) => extractFileKeyFromUrl(url))
        .filter((key) => key !== null);

      if (imageKeys.length > 0) {
        deleteMultipleFiles(imageKeys).catch((error) => {
          console.error('Failed to delete images from S3 (non-critical)', {
            productId,
            imageKeys,
            error: error.message,
          });
        });
      }
    }

    console.info('Product deleted successfully', {
      productId,
      userId,
      imagesDeleted: product.immagini?.length || 0,
    });

    return noContentResponse();
  } catch (error) {
    logError(error, {
      handler: 'deleteProduct',
      productId: event.pathParameters?.productId,
      userId: event.requestContext?.authorizer?.claims?.sub,
      requestId: event.requestContext?.requestId,
    });

    if (error instanceof NotFoundError) {
      return errorResponse(HTTP_STATUS.NOT_FOUND, error.message);
    }

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to delete product'
    );
  }
};
