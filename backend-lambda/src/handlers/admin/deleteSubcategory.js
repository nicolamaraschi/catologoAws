// Percorso: backend-lambda/src/handlers/admin/categories/deleteSubcategory.js
const { adminDeleteSubcategory } = require('../../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../../layers/common/utils/response');
const { logError } = require('../../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoria, sottocategoria } = event.pathParameters;
    if (!categoria || !sottocategoria) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Missing category or subcategory');
    }

    await adminDeleteSubcategory(decodeURIComponent(categoria), decodeURIComponent(sottocategoria));
    return successResponse(HTTP_STATUS.NO_CONTENT, {});
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};