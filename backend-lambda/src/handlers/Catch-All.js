/**
 * Lambda Handler: Catch-All per rotte non esistenti
 * Restituisce sempre 404 invece di 403 Missing Authentication Token
 */

exports.handler = async (event) => {
    console.info('CatchAll invoked', {
      path: event.path,
      method: event.httpMethod,
      requestId: event.requestContext?.requestId,
      userAgent: event.headers?.['User-Agent']
    });
  
    // Handle OPTIONS requests for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
        body: ''
      };
    }
  
    // Return proper 404 with CORS headers
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: {
          message: 'Route not found',
          statusCode: 404,
          path: event.path,
          method: event.httpMethod
        },
        timestamp: new Date().toISOString()
      })
    };
  };