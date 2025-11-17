/**
 * Lambda Handler: Create Product (Admin)
 * POST /api/admin/prodotti
 * Requires: Cognito Authorization
 * Supports: JSON and multipart/form-data with images
 */

const { createProduct } = require('../../layers/common/services/dynamodb');
const { uploadToS3 } = require('../../layers/common/services/s3');
const { successResponse, errorResponse, createdResponse } = require('../../layers/common/utils/response');
const { logError, ValidationError, ConflictError } = require('../../layers/common/utils/error');
const { validateProductCreation } = require('../../layers/common/utils/validation');
const { HTTP_STATUS } = require('../../config/constants');
const multipart = require('lambda-multipart-parser');
const { v4: uuidv4 } = require('uuid');

/**
 * Sanitizza e parsifica JSON in modo robusto
 */
function parseJsonSafely(value, fieldName) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  const stringValue = String(value).trim();
  
  if (!stringValue) {
    return null;
  }

  try {
    let cleaned = stringValue
      .replace(/\r\n/g, '\\n')
      .replace(/\r/g, '\\n')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t');

    const parsed = JSON.parse(cleaned);
    console.info(`✅ Parse successful for ${fieldName}`);
    return parsed;
    
  } catch (firstError) {
    try {
      const parsed = JSON.parse(stringValue);
      console.info(`✅ Parse successful (raw) for ${fieldName}`);
      return parsed;
    } catch (secondError) {
      if (stringValue.startsWith('{') && stringValue.endsWith('}')) {
        try {
          const ultraCleaned = stringValue.replace(/[\x00-\x1F\x7F]/g, '');
          const parsed = JSON.parse(ultraCleaned);
          console.info(`✅ Parse successful (ultra-clean) for ${fieldName}`);
          return parsed;
        } catch (thirdError) {
          console.error(`❌ All parse attempts failed for ${fieldName}`, {
            error: thirdError.message,
            valuePreview: stringValue.substring(0, 100)
          });
          return null;
        }
      }
      
      console.error(`❌ Parse failed for ${fieldName}`, {
        error: secondError.message,
        valuePreview: stringValue.substring(0, 100)
      });
      return null;
    }
  }
}

/**
 * Processa i campi del form in modo robusto
 */
function processFormFields(parsed) {
  const body = {};
  
  const jsonObjectFields = ['nome', 'descrizione', 'categoria', 'sottocategoria'];
  const jsonArrayFields = [];
  const numericFields = ['prezzo', 'pezziPerCartone', 'pezziPerEpal', 'cartoniPerEpal'];

  Object.keys(parsed).forEach(key => {
    if (key === 'files') return;

    let value = parsed[key];
    
    console.info(`Processing field: ${key}`, {
      type: typeof value,
      isNull: value === null,
      isUndefined: value === undefined,
      length: typeof value === 'string' ? value.length : 'N/A'
    });

    if (value === null || value === undefined || value === '') {
      console.info(`⏭️ Skipping empty field: ${key}`);
      return;
    }

    if (jsonObjectFields.includes(key)) {
      const parsed = parseJsonSafely(value, key);
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body[key] = parsed;
      } else if (parsed === null) {
        console.warn(`⚠️ Field ${key} parse failed, skipping`);
      } else {
        console.warn(`⚠️ Field ${key} not an object, converting to {it: value}`);
        body[key] = { it: String(value) };
      }
      return;
    }

    if (jsonArrayFields.includes(key)) {
      const parsed = parseJsonSafely(value, key);
      
      if (Array.isArray(parsed)) {
        body[key] = parsed;
      } else if (parsed === null) {
        body[key] = [];
      } else {
        console.warn(`⚠️ Field ${key} not an array, setting to empty array`);
        body[key] = [];
      }
      return;
    }

    if (numericFields.includes(key)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        body[key] = num;
      } else {
        console.warn(`⚠️ Field ${key} is not a valid number: ${value}`);
      }
      return;
    }

    let stringValue = String(value).trim();

    if (key === 'unita') {
      stringValue = stringValue
        .replace(/\s+/g, '')
        .normalize('NFC')
        .replace(/[^\x20-\x7E€]/g, '')
        .toUpperCase();
      
      console.info('🔧 Normalized unita field', { 
        original: value,
        normalized: stringValue,
        charCodes: Array.from(stringValue).map(c => c.charCodeAt(0))
      });
    }

    body[key] = stringValue;
  });

  return body;
}

exports.handler = async (event) => {
  console.info('🚀 CreateProduct invoked', {
    requestId: event.requestContext?.requestId,
    userId: event.requestContext?.authorizer?.claims?.sub,
    contentType: event.headers['content-type'] || event.headers['Content-Type'],
  });

  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;

    if (!userId) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    console.info('👤 User authenticated', { userId, userEmail });

    let body = {};
    let uploadedImages = [];
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    if (contentType.includes('multipart/form-data')) {
      console.info('📝 Processing multipart/form-data request');
      
      try {
        const parsed = await multipart.parse(event);
        
        console.info('✅ Multipart parsed successfully', {
          fieldCount: Object.keys(parsed).length,
          files: parsed.files ? parsed.files.length : 0,
          fields: Object.keys(parsed).filter(k => k !== 'files')
        });

        body = processFormFields(parsed);

        console.info('✅ Fields processed', {
          processedFields: Object.keys(body),
          fieldCount: Object.keys(body).length
        });

        if (parsed.files && parsed.files.length > 0) {
          console.info('📸 Processing uploaded images', { count: parsed.files.length });
          
          const tempProductId = uuidv4();
          
          for (const file of parsed.files) {
            if (file.fieldname === 'immagini' && file.content) {
              try {
                const fileExtension = file.filename.split('.').pop().toLowerCase();
                const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                
                if (!allowedExtensions.includes(fileExtension)) {
                  console.warn(`⚠️ Invalid file extension: ${fileExtension}`);
                  continue;
                }

                const fileName = `products/${tempProductId}/${uuidv4()}.${fileExtension}`;
                
                console.info('⬆️ Uploading image to S3', { 
                  s3Key: fileName,
                  size: file.content.length 
                });

                const uploadResult = await uploadToS3({
                  key: fileName,
                  body: file.content,
                  contentType: file.contentType,
                  metadata: {
                    originalName: file.filename,
                    tempProductId: tempProductId,
                    uploadedBy: userId,
                    uploadedAt: new Date().toISOString()
                  }
                });

                uploadedImages.push(uploadResult.url);
                console.info('✅ Image uploaded', { url: uploadResult.url });
                
              } catch (uploadError) {
                console.error('❌ Failed to upload image', {
                  fileName: file.filename,
                  error: uploadError.message,
                  stack: uploadError.stack
                });
              }
            }
          }
        }

      } catch (parseError) {
        console.error('❌ Multipart parse error', {
          error: parseError.message,
          stack: parseError.stack
        });
        return errorResponse(
          HTTP_STATUS.BAD_REQUEST, 
          'Failed to parse multipart form data',
          { details: parseError.message }
        );
      }
      
    } else {
      console.info('📝 Processing JSON request');
      
      try {
        body = JSON.parse(event.body || '{}');
        console.info('✅ JSON parsed', { fields: Object.keys(body) });
        
        if (body.unita) {
          body.unita = String(body.unita)
            .trim()
            .replace(/\s+/g, '')
            .normalize('NFC')
            .replace(/[^\x20-\x7E€]/g, '')
            .toUpperCase();
          
          console.info('🔧 Normalized unita (JSON)', { value: body.unita });
        }
        
      } catch (jsonError) {
        console.error('❌ JSON parse error', { error: jsonError.message });
        return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Invalid JSON in request body');
      }
    }

    if (uploadedImages.length > 0) {
      body.immagini = uploadedImages;
      console.info('✅ Added uploaded images to product data', { 
        imageCount: uploadedImages.length 
      });
    }

    if (body.unita) {
      const originalUnita = body.unita;
      
      let normalized = String(body.unita)
        .trim()
        .replace(/\s+/g, '')
        .replace(/\u00A0/g, '')
        .replace(/\u200B/g, '')
        .normalize('NFC');
      
      normalized = normalized.toUpperCase();
      
      const withoutEuro = normalized.replace(/[€€Є]/g, 'EUR');
      
      if (withoutEuro.includes('EUR/KG') || withoutEuro.includes('/KG')) {
        body.unita = '€/KG';
      } else if (withoutEuro.includes('EUR/PZ') || withoutEuro.includes('/PZ')) {
        body.unita = '€/PZ';
      } else {
        body.unita = normalized;
      }
      
      console.info('🔧 Final unita normalization', { 
        original: originalUnita,
        intermediate: normalized,
        final: body.unita
      });
    }

    console.info('📋 Product data prepared for validation', {
      fields: Object.keys(body),
      hasImages: body.immagini ? body.immagini.length : 0,
      unita: body.unita
    });

    let validatedData;
    try {
      validatedData = validateProductCreation(body);
      console.info('✅ Validation passed');
    } catch (validationError) {
      console.error('❌ Validation failed', {
        error: validationError.message,
        details: validationError.details
      });
      throw validationError;
    }

    const product = await createProduct(validatedData);

    console.info('🎉 Product created successfully', {
      productId: product.productId,
      codice: product.codice,
      userId,
      imageCount: product.immagini?.length || 0
    });

    return createdResponse(product);
    
  } catch (error) {
    logError(error, {
      handler: 'createProduct',
      userId: event.requestContext?.authorizer?.claims?.sub,
      requestId: event.requestContext?.requestId,
    });

    if (error instanceof ValidationError) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, error.message, error.details);
    }

    if (error instanceof ConflictError) {
      return errorResponse(HTTP_STATUS.CONFLICT, error.message);
    }

    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to create product',
      { details: error.details || error.toString() }
    );
  }
};