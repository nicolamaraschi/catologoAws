/**
 * DynamoDB service layer
 * Provides high-level DynamoDB operations with retry logic and error handling
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { withRetry } = require('../utils/retry');
const { handleAWSError, NotFoundError, ConflictError } = require('../utils/error');
const { TABLES, GSI } = require('../../../config/constants');

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-1',
});

// Create Document Client with marshalling/unmarshalling
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
async function createProduct(productData) {
  const operation = async () => {
    const now = new Date().toISOString();
    const productId = uuidv4();

    // Calculate pezziPerEpal
    const pezziPerEpal =
      productData.pezziPerCartone && productData.cartoniPerEpal
        ? productData.pezziPerCartone * productData.cartoniPerEpal
        : null;

    const product = {
      productId,
      ...productData,
      pezziPerEpal,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.PRODUCTS,
          Item: product,
          ConditionExpression: 'attribute_not_exists(codice)',
        })
      );

      return product;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ConflictError(`Product with code ${productData.codice} already exists`);
      }
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'createProduct', codice: productData.codice },
  })();
}

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product data
 */
async function getProductById(productId) {
  const operation = async () => {
    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: TABLES.PRODUCTS,
          Key: { productId },
        })
      );

      if (!response.Item) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }

      return response.Item;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getProductById', productId },
  })();
}

/**
 * Get product by codice (using GSI)
 * @param {string} codice - Product code
 * @returns {Promise<Object|null>} Product data or null
 */
async function getProductByCodice(codice) {
  const operation = async () => {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLES.PRODUCTS,
          IndexName: GSI.CODICE_INDEX,
          KeyConditionExpression: 'codice = :codice',
          ExpressionAttributeValues: {
            ':codice': codice,
          },
          Limit: 1,
        })
      );

      return response.Items?.[0] || null;
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getProductByCodice', codice },
  })();
}

/**
 * Update product
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 */
async function updateProduct(productId, updates) {
  const operation = async () => {
    try {
      // Build update expression dynamically
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      // Add updatedAt
      updates.updatedAt = new Date().toISOString();

      // Recalculate pezziPerEpal if necessary
      if (updates.pezziPerCartone !== undefined || updates.cartoniPerEpal !== undefined) {
        const currentProduct = await getProductById(productId);
        const pezziPerCartone = updates.pezziPerCartone ?? currentProduct.pezziPerCartone;
        const cartoniPerEpal = updates.cartoniPerEpal ?? currentProduct.cartoniPerEpal;

        if (pezziPerCartone && cartoniPerEpal) {
          updates.pezziPerEpal = pezziPerCartone * cartoniPerEpal;
        }
      }

      Object.keys(updates).forEach((key) => {
        if (key !== 'productId' && updates[key] !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      });

      if (updateExpressions.length === 0) {
        throw new Error('No fields to update');
      }

      const response = await docClient.send(
        new UpdateCommand({
          TableName: TABLES.PRODUCTS,
          Key: { productId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(productId)',
          ReturnValues: 'ALL_NEW',
        })
      );

      return response.Attributes;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'updateProduct', productId },
  })();
}

/**
 * Delete product
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
async function deleteProduct(productId) {
  const operation = async () => {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLES.PRODUCTS,
          Key: { productId },
          ConditionExpression: 'attribute_exists(productId)',
        })
      );
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'deleteProduct', productId },
  })();
}

/**
 * Get all products with pagination
 * @param {Object} options - Query options (limit, lastEvaluatedKey)
 * @returns {Promise<Object>} Products and pagination info
 */
async function getAllProducts(options = {}) {
  const operation = async () => {
    try {
      const { limit = 50, lastEvaluatedKey = null } = options;

      const params = {
        TableName: TABLES.PRODUCTS,
        Limit: limit,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await docClient.send(new ScanCommand(params));

      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        hasMore: !!response.LastEvaluatedKey,
      };
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getAllProducts' },
  })();
}

/**
 * Get products by category (using GSI)
 * @param {string} categoria - Category name (in Italian)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Products and pagination info
 */
async function getProductsByCategory(categoria, options = {}) {
  const operation = async () => {
    try {
      const { limit = 50, lastEvaluatedKey = null } = options;

      const params = {
        TableName: TABLES.PRODUCTS,
        IndexName: GSI.CATEGORY_INDEX,
        KeyConditionExpression: 'categoria.it = :categoria',
        ExpressionAttributeValues: {
          ':categoria': categoria,
        },
        Limit: limit,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await docClient.send(new QueryCommand(params));

      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        hasMore: !!response.LastEvaluatedKey,
      };
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getProductsByCategory', categoria },
  })();
}

/**
 * Get products by category and subcategory
 * @param {string} categoria - Category name
 * @param {string} sottocategoria - Subcategory name
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Products and pagination info
 */
async function getProductsByCategoryAndSubcategory(categoria, sottocategoria, options = {}) {
  const operation = async () => {
    try {
      const { limit = 50, lastEvaluatedKey = null } = options;

      const params = {
        TableName: TABLES.PRODUCTS,
        IndexName: GSI.CATEGORY_INDEX,
        KeyConditionExpression: 'categoria.it = :categoria',
        FilterExpression: 'sottocategoria.it = :sottocategoria',
        ExpressionAttributeValues: {
          ':categoria': categoria,
          ':sottocategoria': sottocategoria,
        },
        Limit: limit,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await docClient.send(new QueryCommand(params));

      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        hasMore: !!response.LastEvaluatedKey,
      };
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getProductsByCategoryAndSubcategory', categoria, sottocategoria },
  })();
}

/**
 * Get unique categories
 * @returns {Promise<Array>} Array of unique categories
 */
async function getCategories() {
  const operation = async () => {
    try {
      // Scan all products and extract unique categories
      const response = await docClient.send(
        new ScanCommand({
          TableName: TABLES.PRODUCTS,
          ProjectionExpression: 'categoria',
        })
      );

      const categoriesSet = new Set();
      const categoriesMap = new Map();

      response.Items?.forEach((item) => {
        if (item.categoria && item.categoria.it) {
          const categoryKey = item.categoria.it;
          if (!categoriesSet.has(categoryKey)) {
            categoriesSet.add(categoryKey);
            categoriesMap.set(categoryKey, item.categoria);
          }
        }
      });

      return Array.from(categoriesMap.values());
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getCategories' },
  })();
}

/**
 * Get unique subcategories for a category
 * @param {string} categoria - Category name
 * @returns {Promise<Array>} Array of unique subcategories
 */
async function getSubcategories(categoria) {
  const operation = async () => {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: TABLES.PRODUCTS,
          IndexName: GSI.CATEGORY_INDEX,
          KeyConditionExpression: 'categoria.it = :categoria',
          ProjectionExpression: 'sottocategoria',
          ExpressionAttributeValues: {
            ':categoria': categoria,
          },
        })
      );

      const subcategoriesSet = new Set();
      const subcategoriesMap = new Map();

      response.Items?.forEach((item) => {
        if (item.sottocategoria && item.sottocategoria.it) {
          const subcategoryKey = item.sottocategoria.it;
          if (!subcategoriesSet.has(subcategoryKey)) {
            subcategoriesSet.add(subcategoryKey);
            subcategoriesMap.set(subcategoryKey, item.sottocategoria);
          }
        }
      });

      return Array.from(subcategoriesMap.values());
    } catch (error) {
      throw handleAWSError(error);
    }
  };

  return withRetry(operation, {
    context: { operation: 'getSubcategories', categoria },
  })();
}

module.exports = {
  createProduct,
  getProductById,
  getProductByCodice,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductsByCategory,
  getProductsByCategoryAndSubcategory,
  getCategories,
  getSubcategories,
};
