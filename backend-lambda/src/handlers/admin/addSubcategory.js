// Percorso: backend-lambda/src/handlers/admin/categories/addSubcategory.js
const { adminAddSubcategory } = require('../../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../../layers/common/utils/response');
const { logError } = require('../../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoria } = event.pathParameters;
    const { subcategoryName, translations } = JSON.parse(event.body);

    if (!categoria || !subcategoryName || !translations) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Missing category, subcategoryName or translations');
    }

    const item = await adminAddSubcategory(decodeURIComponent(categoria), subcategoryName, translations);
    return successResponse(HTTP_STATUS.CREATED, item);
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};