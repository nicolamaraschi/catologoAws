// Percorso: backend-lambda/src/handlers/admin/categories/createCategory.js
const { adminCreateCategory } = require('../../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../../layers/common/utils/response');
const { logError } = require('../../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoryName, translations } = JSON.parse(event.body);
    if (!categoryName || !translations) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Missing categoryName or translations');
    }

    const item = await adminCreateCategory(categoryName, translations);
    return successResponse(HTTP_STATUS.CREATED, item);
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};