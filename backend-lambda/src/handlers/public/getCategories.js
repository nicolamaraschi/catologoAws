/**
 * Lambda Handler: Get All Categories (Public)
 * GET /api/public/catalogo/categorie
 */

const { getCategories } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('GetCategories invoked', {
    requestId: event.requestContext?.requestId,
  });

  try {
    // Get unique categories from products
    const categories = await getCategories();

    return successResponse(HTTP_STATUS.OK, categories);
  } catch (error) {
    logError(error, {
      handler: 'getCategories',
      requestId: event.requestContext?.requestId,
    });

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to fetch categories'
    );
  }
};
