/**
 * S3 service layer
 * Handles file uploads, presigned URLs, and S3 operations
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { withRetry } = require('../utils/retry');
const { handleAWSError, ValidationError } = require('../utils/error');
const { BUCKETS, IMAGE, PRESIGNED_URL } = require('../../../config/constants');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
});

/**
 * Generate presigned URL for uploading a file
 * @param {string} fileName - Original file name
 * @param {string} fileType - MIME type
 * @param {string} folder - S3 folder (e.g., 'products')
 * @returns {Promise<Object>} Presigned URL and file key
 */
async function generatePresignedUploadUrl(fileName, fileType, folder = 'products') {
  const operation = async () => {
    try {
      // Validate file type
      if (!IMAGE.ALLOWED_TYPES.includes(fileType)) {
        throw new ValidationError(`Invalid file type. Allowed types: ${IMAGE.ALLOWED_TYPES.join(', ')}`);
      }

      // Generate unique file name
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const fileKey = `${folder}/${uniqueFileName}`;

      // Create presigned URL
      const command = new PutObjectCommand({
        Bucket: BUCKETS.IMAGES,
        Key: fileKey,
        ContentType: fileType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL.EXPIRATION_SECONDS,
      });

      return {
        uploadUrl: presignedUrl,
        fileKey,
        publicUrl: `https://${BUCKETS.IMAGES}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${fileKey}`,
        expiresIn: PRESIGNED_URL.EXPIRATION_SECONDS,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'generatePresignedUploadUrl', fileName, fileType },
  })();
}

/**
 * Generate presigned URL for downloading a file
 * @param {string} fileKey - S3 file key
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {Promise<string>} Presigned download URL
 */
async function generatePresignedDownloadUrl(fileKey, expiresIn = 3600) {
  const operation = async () => {
    try {
      // Check if file exists
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: BUCKETS.IMAGES,
          Key: fileKey,
        })
      );

      // Create presigned URL
      const command = new PutObjectCommand({
        Bucket: BUCKETS.IMAGES,
        Key: fileKey,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'generatePresignedDownloadUrl', fileKey },
  })();
}

/**
 * Delete file from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<void>}
 */
async function deleteFile(fileKey) {
  const operation = async () => {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKETS.IMAGES,
          Key: fileKey,
        })
      );

      console.info('File deleted from S3', { fileKey });
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'deleteFile', fileKey },
  })();
}

/**
 * Delete multiple files from S3
 * @param {Array<string>} fileKeys - Array of S3 file keys
 * @returns {Promise<void>}
 */
async function deleteMultipleFiles(fileKeys) {
  const operation = async () => {
    try {
      const deletePromises = fileKeys.map((fileKey) => deleteFile(fileKey));
      await Promise.all(deletePromises);

      console.info('Multiple files deleted from S3', { count: fileKeys.length });
    } catch (error) {
      console.error('Error deleting multiple files', { error: error.message, fileKeys });
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'deleteMultipleFiles', count: fileKeys.length },
  })();
}

/**
 * Check if file exists in S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(fileKey) {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKETS.IMAGES,
        Key: fileKey,
      })
    );
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw handleAWSError(error);
  }
}

/**
 * Extract file key from S3 URL
 * @param {string} url - S3 URL
 * @returns {string|null} File key or null if invalid URL
 */
function extractFileKeyFromUrl(url) {
  try {
    // Match patterns like:
    // https://bucket.s3.region.amazonaws.com/folder/file.jpg
    // https://bucket.s3.amazonaws.com/folder/file.jpg
    const regex = /amazonaws\.com\/(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('Failed to extract file key from URL', { url });
    return null;
  }
}

/**
 * Build public URL for S3 file
 * @param {string} fileKey - S3 file key
 * @returns {string} Public URL
 */
function buildPublicUrl(fileKey) {
  const region = process.env.AWS_REGION || 'eu-west-1';
  return `https://${BUCKETS.IMAGES}.s3.${region}.amazonaws.com/${fileKey}`;
}

/**
 * Validate image file
 * @param {string} fileName - File name
 * @param {string} fileType - MIME type
 * @param {number} fileSize - File size in bytes
 * @throws {ValidationError} If validation fails
 */
function validateImageFile(fileName, fileType, fileSize) {
  // Check file type
  if (!IMAGE.ALLOWED_TYPES.includes(fileType)) {
    throw new ValidationError(
      `Invalid file type. Allowed types: ${IMAGE.ALLOWED_TYPES.join(', ')}`,
      { fileName, fileType }
    );
  }

  // Check file size
  if (fileSize > IMAGE.MAX_SIZE_BYTES) {
    throw new ValidationError(
      `File size exceeds maximum allowed (${IMAGE.MAX_SIZE_MB}MB)`,
      { fileName, fileSize, maxSize: IMAGE.MAX_SIZE_BYTES }
    );
  }

  // Check file extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  if (!validExtensions.includes(fileExtension)) {
    throw new ValidationError(
      `Invalid file extension. Allowed extensions: ${validExtensions.join(', ')}`,
      { fileName, fileExtension }
    );
  }
}

module.exports = {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteFile,
  deleteMultipleFiles,
  fileExists,
  extractFileKeyFromUrl,
  buildPublicUrl,
  validateImageFile,
};
