/**
 * Lambda Handler: Get All Subcategories (Public)
 * GET /api/public/catalogo/sottocategorie
 */

const { getAllSubcategories } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('GetAllSubcategories invoked', {
    requestId: event.requestContext?.requestId,
  });

  try {
    // Chiama la nuova funzione per ottenere le sottocategorie uniche
    const subcategories = await getAllSubcategories();

    return successResponse(HTTP_STATUS.OK, subcategories);
  } catch (error) {
    logError(error, {
      handler: 'getAllSubcategories',
      requestId: event.requestContext?.requestId,
    });

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to fetch subcategories'
    );
  }
};