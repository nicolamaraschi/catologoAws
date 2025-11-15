/**
 * Lambda Handler: Generate Presigned URL for Image Upload (Admin)
 * POST /api/admin/upload/presigned-url
 * Requires: Cognito Authorization
 */

const { generatePresignedUploadUrl } = require('../../layers/common/services/s3');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError, ValidationError } = require('../../layers/common/utils/error');
const { validateUploadImage } = require('../../layers/common/utils/validation');
const { HTTP_STATUS } = require('../../config/constants');

exports.handler = async (event) => {
  console.info('GetPresignedUrl invoked', {
    requestId: event.requestContext?.requestId,
    userId: event.requestContext?.authorizer?.claims?.sub,
  });

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');

    // Validate input
    const validatedData = validateUploadImage(body);

    // Check user authorization
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!userId) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    console.info('Presigned URL requested', {
      fileName: validatedData.fileName,
      fileType: validatedData.fileType,
      fileSize: validatedData.fileSize,
      userId,
    });

    // Generate presigned URL
    const result = await generatePresignedUploadUrl(
      validatedData.fileName,
      validatedData.fileType,
      'products'
    );

    console.info('Presigned URL generated', {
      fileKey: result.fileKey,
      userId,
    });

    return successResponse(HTTP_STATUS.OK, result);
  } catch (error) {
    logError(error, {
      handler: 'getPresignedUrl',
      userId: event.requestContext?.authorizer?.claims?.sub,
      requestId: event.requestContext?.requestId,
    });

    if (error instanceof ValidationError) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, error.message, error.details);
    }

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to generate presigned URL'
    );
  }
};
