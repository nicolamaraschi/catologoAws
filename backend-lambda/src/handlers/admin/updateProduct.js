/**
 * Lambda Handler: Update Product (Admin) - VERSIONE INDISTRUTTIBILE
 * PUT /api/admin/prodotti/{productId}
 * Requires: Cognito Authorization
 * Supports: JSON and multipart/form-data with images
 */

const { updateProduct, getProductById } = require('../../layers/common/services/dynamodb');
const { uploadToS3, deleteFromS3 } = require('../../layers/common/services/s3');
const { successResponse, errorResponse } = require('../../layers/common/utils/response');
const { logError, ValidationError, NotFoundError } = require('../../layers/common/utils/error');
const { validateProductUpdate } = require('../../layers/common/utils/validation');
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

  // Se è già un oggetto, ritornalo così com'è
  if (typeof value === 'object') {
    return value;
  }

  // Converti a stringa se necessario
  const stringValue = String(value).trim();
  
  // Se è stringa vuota, ritorna null
  if (!stringValue) {
    return null;
  }

  try {
    // Sanitizza caratteri problematici comuni
    let cleaned = stringValue
      .replace(/\r\n/g, '\\n')  // Windows line endings
      .replace(/\r/g, '\\n')    // Mac line endings
      .replace(/\n/g, '\\n')    // Unix line endings
      .replace(/\t/g, '\\t');   // Tabs

    const parsed = JSON.parse(cleaned);
    
    console.info(`✅ Parse successful for ${fieldName}`, {
      originalLength: stringValue.length,
      parsedType: typeof parsed
    });
    
    return parsed;
    
  } catch (firstError) {
    // Tentativo 2: Prova senza sanitizzazione
    try {
      const parsed = JSON.parse(stringValue);
      console.info(`✅ Parse successful (raw) for ${fieldName}`);
      return parsed;
    } catch (secondError) {
      // Tentativo 3: Se sembra un oggetto ma ha caratteri strani, prova a ricostruirlo
      if (stringValue.startsWith('{') && stringValue.endsWith('}')) {
        try {
          // Rimuovi tutti i caratteri di controllo
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
  
  // Campi che devono essere oggetti JSON (multilingua o strutturati)
  const jsonObjectFields = ['nome', 'descrizione', 'categoria', 'sottocategoria'];
  
  // Campi che devono essere array JSON
  const jsonArrayFields = ['removeImages', 'keepExistingImages'];
  
  // Campi numerici
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

    // Skip valori nulli/undefined/vuoti
    if (value === null || value === undefined || value === '') {
      console.info(`⏭️ Skipping empty field: ${key}`);
      return;
    }

    // Gestione campi oggetto JSON (multilingua)
    if (jsonObjectFields.includes(key)) {
      const parsed = parseJsonSafely(value, key);
      
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body[key] = parsed;
      } else if (parsed === null) {
        // Non aggiungere il campo se il parsing è fallito
        console.warn(`⚠️ Field ${key} parse failed, skipping`);
      } else {
        // Se è una stringa semplice, crea oggetto multilingua con default 'it'
        console.warn(`⚠️ Field ${key} not an object, converting to {it: value}`);
        body[key] = { it: String(value) };
      }
      return;
    }

    // Gestione campi array JSON
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

    // Gestione campi numerici
    if (numericFields.includes(key)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        body[key] = num;
      } else {
        console.warn(`⚠️ Field ${key} is not a valid number: ${value}`);
      }
      return;
    }

    // Tutti gli altri campi: stringhe semplici
    let stringValue = String(value).trim();

    // 🔧 FIX SPECIALE PER CAMPO UNITA - Normalizza encoding del simbolo €
    if (key === 'unita') {
      stringValue = stringValue
        .replace(/\s+/g, '')          // Rimuovi tutti gli spazi (anche quelli nascosti)
        .normalize('NFC')              // Normalizza caratteri Unicode
        .replace(/[^\x20-\x7E€]/g, '') // Rimuovi caratteri non stampabili tranne €
        .toUpperCase();                // Converti in maiuscolo per uniformità
      
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
  console.info('🚀 UpdateProduct invoked', {
    requestId: event.requestContext?.requestId,
    productId: event.pathParameters?.productId,
    userId: event.requestContext?.authorizer?.claims?.sub,
    contentType: event.headers['content-type'] || event.headers['Content-Type'],
  });

  try {
    // ========== VALIDAZIONE PATH PARAMETERS ==========
    const { productId } = event.pathParameters || {};

    if (!productId) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, 'Product ID is required');
    }

    // ========== VALIDAZIONE AUTENTICAZIONE ==========
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;

    if (!userId) {
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, 'User not authenticated');
    }

    console.info('👤 User authenticated', { userId, userEmail });

    // ========== VERIFICA ESISTENZA PRODOTTO ==========
    const existingProduct = await getProductById(productId);
    
    if (!existingProduct) {
      return errorResponse(HTTP_STATUS.NOT_FOUND, 'Product not found');
    }

    console.info('📦 Existing product found', {
      productId,
      currentImages: existingProduct.immagini?.length || 0
    });

    // ========== PARSING BODY ==========
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

        // Processa i campi con funzione robusta
        body = processFormFields(parsed);

        console.info('✅ Fields processed', {
          processedFields: Object.keys(body),
          fieldCount: Object.keys(body).length
        });

        // ========== GESTIONE FILE IMMAGINI ==========
        if (parsed.files && parsed.files.length > 0) {
          console.info('📸 Processing uploaded images', { count: parsed.files.length });
          
          for (const file of parsed.files) {
            if (file.fieldname === 'immagini' && file.content) {
              try {
                const fileExtension = file.filename.split('.').pop().toLowerCase();
                const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                
                if (!allowedExtensions.includes(fileExtension)) {
                  console.warn(`⚠️ Invalid file extension: ${fileExtension}`);
                  continue;
                }

                const fileName = `products/${productId}/${uuidv4()}.${fileExtension}`;
                
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
                    productId: productId,
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
                // Non bloccare tutto, continua con le altre immagini
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
      // ========== GESTIONE JSON REQUEST ==========
      console.info('📝 Processing JSON request');
      
      try {
        body = JSON.parse(event.body || '{}');
        console.info('✅ JSON parsed', { fields: Object.keys(body) });
        
        // 🔧 Normalizza campo unita anche per richieste JSON
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

    // ========== GESTIONE IMMAGINI ==========
    let finalImages = [];

    // Determina immagini di partenza
    if (body.keepExistingImages && Array.isArray(body.keepExistingImages)) {
      finalImages = [...body.keepExistingImages];
      console.info('🖼️ Keeping specific images', { count: finalImages.length });
    } else {
      finalImages = [...(existingProduct.immagini || [])];
      console.info('🖼️ Keeping all existing images', { count: finalImages.length });
    }

    // Rimuovi immagini specificate
    if (body.removeImages && Array.isArray(body.removeImages) && body.removeImages.length > 0) {
      console.info('🗑️ Removing images', { count: body.removeImages.length });
      
      for (const imageUrl of body.removeImages) {
        try {
          await deleteFromS3(imageUrl);
          finalImages = finalImages.filter(img => img !== imageUrl);
          console.info('✅ Image deleted', { url: imageUrl });
        } catch (deleteError) {
          console.error('❌ Failed to delete image', {
            url: imageUrl,
            error: deleteError.message
          });
          // Non bloccare, continua
        }
      }
    }

    // Aggiungi nuove immagini
    if (uploadedImages.length > 0) {
      finalImages = [...finalImages, ...uploadedImages];
      console.info('✅ Added new images', { 
        newCount: uploadedImages.length,
        totalCount: finalImages.length 
      });
    }

    // ========== PREPARA DATI PER UPDATE ==========
    const updateData = { ...body };
    delete updateData.productId;
    delete updateData.removeImages;
    delete updateData.keepExistingImages;
    updateData.immagini = finalImages;

    // 🔧 DOPPIA SICUREZZA: Normalizza ancora una volta il campo unita
   // 🔧 DOPPIA SICUREZZA: Normalizza ancora una volta il campo unita
if (updateData.unita) {
  const originalUnita = updateData.unita;
  
  // Rimuovi TUTTI gli spazi (anche zero-width)
  let normalized = String(updateData.unita)
    .trim()
    .replace(/\s+/g, '')
    .replace(/\u00A0/g, '')  // Non-breaking space
    .replace(/\u200B/g, '')  // Zero-width space
    .normalize('NFC');
  
  // Converti in maiuscolo
  normalized = normalized.toUpperCase();
  
  // 💶 FIX DRASTICO: Sostituisci QUALSIASI variante del simbolo euro con € standard
  // Rimuovi tutto ciò che non è alfanumerico o slash, poi riaggiungi € standard
  const withoutEuro = normalized.replace(/[€€Є]/g, 'EUR'); // Sostituisci con EUR temporaneo
  
  // Ora ricostruisci il formato corretto
  if (withoutEuro.includes('EUR/KG') || withoutEuro.includes('/KG')) {
    updateData.unita = '€/KG';
  } else if (withoutEuro.includes('EUR/PZ') || withoutEuro.includes('/PZ')) {
    updateData.unita = '€/PZ';
  } else {
    // Se non riconosciuto, prova ancora con il valore originale pulito
    updateData.unita = normalized;
  }
  
  console.info('🔧 Final unita normalization', { 
    original: originalUnita,
    intermediate: normalized,
    final: updateData.unita,
    originalCharCodes: Array.from(originalUnita).map(c => `${c}=${c.charCodeAt(0)}`),
    finalCharCodes: Array.from(updateData.unita).map(c => `${c}=${c.charCodeAt(0)}`)
  });
}

    console.info('📋 Update data prepared', {
      productId,
      fields: Object.keys(updateData),
      imageCount: finalImages.length,
      unita: updateData.unita
    });

    // ========== VALIDAZIONE DATI ==========
    let validatedData;
    try {
      validatedData = validateProductUpdate({
        productId,
        ...updateData
      });
      console.info('✅ Validation passed');
    } catch (validationError) {
      console.error('❌ Validation failed', {
        error: validationError.message,
        details: validationError.details
      });
      throw validationError;
    }

    const { productId: _, ...updates } = validatedData;

    // ========== UPDATE DYNAMODB ==========
    const updatedProduct = await updateProduct(productId, updates);

    console.info('🎉 Product updated successfully', {
      productId,
      userId,
      updatedFields: Object.keys(updates)
    });

    return successResponse(HTTP_STATUS.OK, updatedProduct);
    
  } catch (error) {
    logError(error, {
      handler: 'updateProduct',
      productId: event.pathParameters?.productId,
      userId: event.requestContext?.authorizer?.claims?.sub,
      requestId: event.requestContext?.requestId
    });

    if (error instanceof ValidationError) {
      return errorResponse(HTTP_STATUS.BAD_REQUEST, error.message, error.details);
    }
    if (error instanceof NotFoundError) {
      return errorResponse(HTTP_STATUS.NOT_FOUND, error.message);
    }
    
    return errorResponse(
      error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error.message || 'Failed to update product',
      { details: error.details || error.toString() }
    );
  }
};