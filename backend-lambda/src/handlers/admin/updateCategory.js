// Percorso: backend-lambda/src/handlers/admin/categories/updateCategory.js
const { adminUpdateCategory } = require('../../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../../layers/common/utils/response');
const { logError } = require('../../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoria } = event.pathParameters;
    const { translations } = JSON.parse(event.body);

    if (!categoria || !translations) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Missing category or translations');
    }

    const item = await adminUpdateCategory(decodeURIComponent(categoria), translations);
    return successResponse(HTTP_STATUS.OK, item);
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};