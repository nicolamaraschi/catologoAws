// Percorso: backend-lambda/src/handlers/admin/categories/deleteCategory.js
const { adminDeleteCategory } = require('../../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../../layers/common/utils/response');
const { logError } = require('../../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoria } = event.pathParameters;
    if (!categoria) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Missing category');
    }

    await adminDeleteCategory(decodeURIComponent(categoria));
    return successResponse(HTTP_STATUS.NO_CONTENT, {});
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};