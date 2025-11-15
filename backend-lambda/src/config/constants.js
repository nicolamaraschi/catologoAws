/**
 * Constants and configuration for Lambda functions
 * Environment variables are set via SAM template
 */

module.exports = {
  // DynamoDB Table Names (from environment)
  TABLES: {
    PRODUCTS: process.env.PRODUCTS_TABLE || 'CatalogoProducts',
    CATEGORIES: process.env.CATEGORIES_TABLE || 'CatalogoCategories',
  },

  // S3 Bucket Names (from environment)
  BUCKETS: {
    IMAGES: process.env.IMAGES_BUCKET || 'catalogo-product-images',
  },

  // API Response Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Product Categories
  CATEGORIES: {
    DOMESTICO: 'Domestico',
    INDUSTRIALE: 'Industriale',
  },

  // Supported Languages
  LANGUAGES: ['it', 'en', 'fr', 'es', 'de'],

  // Packaging Types
  PACKAGING_TYPES: [
    'Barattolo 1kg',
    'BigBag 600kg',
    'Flacone 750g',
    'Sacco 10kg',
    'Sacco 20kg',
    'Secchio 200tabs',
    'Secchio 3.6kg',
    'Secchio 4kg',
    'Secchio 5kg',
    'Secchio 6kg',
    'Secchio 8kg',
    'Secchio 9kg',
    'Secchio 10kg',
    'Astuccio 100g',
    'Astuccio 700g',
    'Astuccio 2400g',
    'Astuccio 900g',
    'Astuccio 200g',
    'Flacone 500ml',
    'Flacone Trigger 750ml',
    'Tanica 1000l',
    'Flacone 5l',
    'Fustone 5.6kg',
    'Cartone 400tabs',
  ],

  // Price Units
  PRICE_UNITS: ['€/PZ', '€/KG'],

  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY_MS: 100,
    MAX_DELAY_MS: 5000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Image Configuration
  IMAGE: {
    MAX_SIZE_MB: 5,
    MAX_SIZE_BYTES: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    MAX_IMAGES_PER_PRODUCT: 10,
  },

  // Presigned URL Configuration
  PRESIGNED_URL: {
    EXPIRATION_SECONDS: 300, // 5 minutes
  },

  // DynamoDB GSI Names
  GSI: {
    CATEGORY_INDEX: 'CategoryIndex',
    SUBCATEGORY_INDEX: 'SubcategoryIndex',
    CODICE_INDEX: 'CodiceIndex',
  },

  // Error Messages
  ERRORS: {
    PRODUCT_NOT_FOUND: 'Product not found',
    CATEGORY_NOT_FOUND: 'Category not found',
    INVALID_INPUT: 'Invalid input parameters',
    DUPLICATE_CODE: 'Product code already exists',
    UNAUTHORIZED: 'Unauthorized access',
    INTERNAL_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    IMAGE_TOO_LARGE: 'Image size exceeds maximum allowed',
    INVALID_IMAGE_TYPE: 'Invalid image file type',
    TOO_MANY_IMAGES: 'Maximum number of images exceeded',
  },
};
