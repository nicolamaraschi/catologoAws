/**
 * Lambda Handler: Get Products By Category/Subcategory (Public)
 * GET /api/public/catalogo/categoria/{categoria}
 * GET /api/public/catalogo/categoria/{categoria}/sottocategoria/{sottocategoria}
 */

const { getProductsByCategory, getProductsByCategoryAndSubcategory, getSubcategories } = require('../../layers/common/services/dynamodb');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError } = require('../../layers/common/utils/error');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('GetProductsByCategory invoked', {
    requestId: event.requestContext?.requestId,
    pathParameters: event.pathParameters,
  });

  try {
    const { categoria, sottocategoria } = event.pathParameters || {};

    if (!categoria) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Category is required');
    }

    // Decode URL-encoded category names
    const decodedCategoria = decodeURIComponent(categoria);
    const decodedSottocategoria = sottocategoria ? decodeURIComponent(sottocategoria) : null;

    // Parse query parameters for pagination
    const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 50;
    const lastEvaluatedKey = event.queryStringParameters?.lastKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : null;

    let result;

    // Check if this is a request for subcategories list
    if (event.path.endsWith('/sottocategorie')) {
      const subcategories = await getSubcategories(decodedCategoria);
      return successResponse(HTTP_STATUS.OK, subcategories);
    }

    // Get products by category and optionally subcategory
    if (decodedSottocategoria) {
      result = await getProductsByCategoryAndSubcategory(decodedCategoria, decodedSottocategoria, {
        limit,
        lastEvaluatedKey,
      });
    } else {
      result = await getProductsByCategory(decodedCategoria, { limit, lastEvaluatedKey });
    }

    // Build response with pagination metadata
    const metadata = {
      count: result.items.length,
      hasMore: result.hasMore,
      categoria: decodedCategoria,
    };

    if (decodedSottocategoria) {
      metadata.sottocategoria = decodedSottocategoria;
    }

    if (result.lastEvaluatedKey) {
      metadata.nextKey = encodeURIComponent(JSON.stringify(result.lastEvaluatedKey));
    }

    return successResponse(HTTP_STATUS.OK, result.items, metadata);
  } catch (error) {
    logError(error, {
      handler: 'getProductsByCategory',
      categoria: event.pathParameters?.categoria,
      sottocategoria: event.pathParameters?.sottocategoria,
      requestId: event.requestContext?.requestId,
    });

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to fetch products by category'
    );
  }
};
