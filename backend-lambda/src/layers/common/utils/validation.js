/**
 * Input validation utilities using Joi
 * Validates all incoming data to Lambda functions
 */

const Joi = require('joi');
const { ValidationError } = require('./error');
const { CATEGORIES, PACKAGING_TYPES, PRICE_UNITS, LANGUAGES } = require('../../../config/constants');

/**
 * Multilingual text schema (required for all 5 languages)
 */
const multilingualSchema = Joi.object({
  it: Joi.string().required(),
  en: Joi.string().required(),
  fr: Joi.string().required(),
  es: Joi.string().required(),
  de: Joi.string().required(),
}).required();

/**
 * Optional multilingual text schema
 */
const multilingualSchemaOptional = Joi.object({
  it: Joi.string().allow('').optional(),
  en: Joi.string().allow('').optional(),
  fr: Joi.string().allow('').optional(),
  es: Joi.string().allow('').optional(),
  de: Joi.string().allow('').optional(),
});

/**
 * Product creation/update schema
 */
const productSchema = Joi.object({
  nome: multilingualSchema,
  codice: Joi.string().trim().uppercase().required(),
  tipo: Joi.string().trim().required(),
  prezzo: Joi.number().min(0).required(),
  unita: Joi.string().valid(...PRICE_UNITS).required(),
  categoria: multilingualSchema,
  sottocategoria: multilingualSchema,
  tipoImballaggio: Joi.string().valid(...PACKAGING_TYPES).required(),
  pezziPerCartone: Joi.number().integer().min(0).optional(),
  cartoniPerEpal: Joi.number().integer().min(0).optional(),
  descrizione: multilingualSchemaOptional,
  immagini: Joi.array().items(Joi.string().uri()).max(10).optional(),
});

/**
 * Product update schema (all fields optional except ID)
 */
const productUpdateSchema = Joi.object({
  productId: Joi.string().required(),
  nome: multilingualSchemaOptional,
  codice: Joi.string().trim().uppercase().optional(),
  tipo: Joi.string().trim().optional(),
  prezzo: Joi.number().min(0).optional(),
  unita: Joi.string().valid(...PRICE_UNITS).optional(),
  categoria: multilingualSchemaOptional,
  sottocategoria: multilingualSchemaOptional,
  tipoImballaggio: Joi.string().valid(...PACKAGING_TYPES).optional(),
  pezziPerCartone: Joi.number().integer().min(0).optional(),
  cartoniPerEpal: Joi.number().integer().min(0).optional(),
  descrizione: multilingualSchemaOptional,
  immagini: Joi.array().items(Joi.string().uri()).max(10).optional(),
}).min(2); // At least ID + one field to update

/**
 * Category filter schema
 */
const categoryFilterSchema = Joi.object({
  categoria: Joi.string().trim().required(),
  sottocategoria: Joi.string().trim().optional(),
  lingua: Joi.string().valid(...LANGUAGES).optional().default('it'),
});

/**
 * Query parameters schema
 */
const queryParamsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
  sortBy: Joi.string().valid('nome', 'prezzo', 'codice', 'createdAt').optional().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc'),
  lingua: Joi.string().valid(...LANGUAGES).optional().default('it'),
});

/**
 * Upload image schema
 */
const uploadImageSchema = Joi.object({
  fileName: Joi.string().required(),
  fileType: Joi.string().valid('image/jpeg', 'image/jpg', 'image/png', 'image/webp').required(),
  fileSize: Joi.number().integer().min(1).max(5 * 1024 * 1024).required(), // Max 5MB
});

/**
 * Validate data against schema
 * @param {Object} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @throws {ValidationError} If validation fails
 * @returns {Object} Validated and sanitized data
 */
function validate(data, schema) {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Return all errors
    stripUnknown: true, // Remove unknown fields
    convert: true, // Type coercion
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    throw new ValidationError('Validation failed', details);
  }

  return value;
}

/**
 * Validate product creation data
 * @param {Object} data - Product data
 * @returns {Object} Validated product data
 */
function validateProductCreation(data) {
  return validate(data, productSchema);
}

/**
 * Validate product update data
 * @param {Object} data - Product update data
 * @returns {Object} Validated update data
 */
function validateProductUpdate(data) {
  return validate(data, productUpdateSchema);
}

/**
 * Validate category filter parameters
 * @param {Object} params - Filter parameters
 * @returns {Object} Validated parameters
 */
function validateCategoryFilter(params) {
  return validate(params, categoryFilterSchema);
}

/**
 * Validate query parameters
 * @param {Object} params - Query parameters
 * @returns {Object} Validated query parameters
 */
function validateQueryParams(params) {
  return validate(params, queryParamsSchema);
}

/**
 * Validate upload image request
 * @param {Object} data - Upload request data
 * @returns {Object} Validated data
 */
function validateUploadImage(data) {
  return validate(data, uploadImageSchema);
}

/**
 * Validate UUID
 * @param {string} id - ID to validate
 * @throws {ValidationError} If ID is not a valid UUID
 */
function validateUUID(id) {
  const uuidSchema = Joi.string().guid({ version: 'uuidv4' }).required();
  validate({ id }, Joi.object({ id: uuidSchema }));
}

module.exports = {
  validate,
  validateProductCreation,
  validateProductUpdate,
  validateCategoryFilter,
  validateQueryParams,
  validateUploadImage,
  validateUUID,
};
