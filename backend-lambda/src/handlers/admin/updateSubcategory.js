// Percorso: backend-lambda/src/handlers/admin/categories/updateSubcategory.js
// NOTA: Questo handler è identico a 'addSubcategory' perché usiamo PutItem,
// che serve sia per creare che per aggiornare.
const { adminAddSubcategory } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  try {
    const { categoria, sottocategoria } = event.pathParameters;
    const { translations } = JSON.parse(event.body);

    if (!categoria || !sottocategoria || !translations) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Missing category, subcategory or translations');
    }

    // Usiamo la stessa funzione 'add' perché PutItem sovrascrive
    const item = await adminAddSubcategory(decodeURIComponent(categoria), decodeURIComponent(sottocategoria), translations);
    return successResponse(HTTP_STATUS.OK, item);
  } catch (error) {
    logError(error);
    return errorResponse(error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};