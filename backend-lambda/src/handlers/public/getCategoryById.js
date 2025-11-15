/**
 * Lambda Handler: Get Single Category By ID (Public)
 * GET /api/public/catalogo/categorie/{categoryId}
 */
const { getCategoryById } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoryId } = event.pathParameters;
    if (!categoryId) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Category ID is required');
    }

    const category = await getCategoryById(decodeURIComponent(categoryId));
    return successResponse(HTTP_STATUS.OK, category);
  
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};