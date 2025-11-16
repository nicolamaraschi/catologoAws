/**
 * DynamoDB service layer
 * Gestisce la logica di accesso ai dati per ProductsTable e CategoriesTable.
 * Include logica di retry, gestione errori, e design di accesso "esplicito" per le categorie.
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
  BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { withRetry } = require('../utils/retry');
const { handleAWSError, NotFoundError, ConflictError } = require('../utils/error');
const { TABLES, GSI } = require('../../../config/constants');

// Inizializza client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-west-1',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Ottieni i nomi delle tabelle dall'ambiente (impostato da template.yaml)
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;

// ============================================================================
// FUNZIONI GESTIONE PRODOTTI (Logica Esistente)
// ============================================================================

/**
 * Crea un nuovo prodotto
 * @param {Object} productData - Dati del prodotto
 * @returns {Promise<Object>} Prodotto creato
 */
async function createProduct(productData) {
  const operation = async () => {
    const now = new Date().toISOString();
    const productId = uuidv4();

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
          TableName: PRODUCTS_TABLE,
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
 * Ottieni prodotto per ID
 * @param {string} productId - ID Prodotto
 * @returns {Promise<Object>} Dati Prodotto
 */
async function getProductById(productId) {
  const operation = async () => {
    try {
      const response = await docClient.send(
        new GetCommand({
          TableName: PRODUCTS_TABLE,
          Key: { productId },
        })
      );
      if (!response.Item) {
        throw new NotFoundError(`Product with ID ${productId} not found`);
      }
      return response.Item;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getProductById', productId },
  })();
}

/**
 * Ottieni prodotto per codice (usando GSI)
 * @param {string} codice - Codice Prodotto
 * @returns {Promise<Object|null>} Dati Prodotto o null
 */
async function getProductByCodice(codice) {
  const operation = async () => {
    try {
      const response = await docClient.send(
        new QueryCommand({
          TableName: PRODUCTS_TABLE,
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
 * Aggiorna prodotto
 * @param {string} productId - ID Prodotto
 * @param {Object} updates - Campi da aggiornare
 * @returns {Promise<Object>} Prodotto aggiornato
 */
async function updateProduct(productId, updates) {
  const operation = async () => {
    try {
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};
      updates.updatedAt = new Date().toISOString();

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

      if (updateExpressions.length === 0) throw new Error('No fields to update');

      const response = await docClient.send(
        new UpdateCommand({
          TableName: PRODUCTS_TABLE,
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
 * Cancella prodotto
 * @param {string} productId - ID Prodotto
 * @returns {Promise<void>}
 */
async function deleteProduct(productId) {
  const operation = async () => {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: PRODUCTS_TABLE,
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
 * Ottieni tutti i prodotti con paginazione
 * @param {Object} options - Opzioni query (limit, lastEvaluatedKey)
 * @returns {Promise<Object>} Prodotti e info paginazione
 */
async function getAllProducts(options = {}) {
  const operation = async () => {
    try {
      const { limit = 50, lastEvaluatedKey = null } = options;
      const params = {
        TableName: PRODUCTS_TABLE,
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
 * Ottieni prodotti per categoria (usando GSI)
 * @param {string} categoria - Nome Categoria (in Italiano)
 * @param {Object} options - Opzioni query
 * @returns {Promise<Object>} Prodotti e info paginazione
 */
async function getProductsByCategory(categoria, options = {}) {
  const operation = async () => {
    try {
      const { limit = 50, lastEvaluatedKey = null } = options;
      
      console.info('Querying products by category', {
        categoria,
        limit,
        hasLastKey: !!lastEvaluatedKey
      });

      // USA IL CAMPO FLAT categoriaIt per il GSI
      const params = {
        TableName: PRODUCTS_TABLE,
        IndexName: GSI.CATEGORY_INDEX,
        KeyConditionExpression: 'categoriaIt = :categoria',  // ✅ CAMPO FLAT
        ExpressionAttributeValues: {
          ':categoria': categoria,
        },
        Limit: limit,
      };

      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      console.info('DynamoDB Query params', { 
        indexName: params.IndexName,
        keyCondition: params.KeyConditionExpression,
        categoria 
      });

      const response = await docClient.send(new QueryCommand(params));
      
      console.info('Query results', {
        itemsCount: response.Items?.length || 0,
        hasMore: !!response.LastEvaluatedKey
      });

      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        hasMore: !!response.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Error in getProductsByCategory', {
        error: error.message,
        categoria,
        errorName: error.name
      });
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getProductsByCategory', categoria },
  })();
}
/**
 * Ottieni prodotti per categoria e sottocategoria
 * @param {string} categoria - Nome Categoria
 * @param {string} sottocategoria - Nome Sottocategoria
 * @param {Object} options - Opzioni query
 * @returns {Promise<Object>} Prodotti e info paginazione
 */
async function getProductsByCategoryAndSubcategory(categoria, sottocategoria, options = {}) {
  const operation = async () => {
    try {
      const { limit = 50, lastEvaluatedKey = null } = options;
      
      console.info('Querying products by category and subcategory', {
        categoria,
        sottocategoria,
        limit
      });

      // USA IL CAMPO FLAT categoriaIt per il GSI + FilterExpression per sottocategoria
      const params = {
        TableName: PRODUCTS_TABLE,
        IndexName: GSI.CATEGORY_INDEX,
        KeyConditionExpression: 'categoriaIt = :categoria',  // ✅ CAMPO FLAT
        FilterExpression: 'sottocategoriaIt = :sottocategoria OR sottocategoria.#it = :sottocategoria',
        ExpressionAttributeNames: {
          '#it': 'it'
        },
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

      console.info('Query results', {
        itemsCount: response.Items?.length || 0,
        hasMore: !!response.LastEvaluatedKey
      });

      return {
        items: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey,
        hasMore: !!response.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Error in getProductsByCategoryAndSubcategory', {
        error: error.message,
        categoria,
        sottocategoria,
        errorName: error.name
      });
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getProductsByCategoryAndSubcategory', categoria, sottocategoria },
  })();
}
// ============================================================================
// FUNZIONI PUBBLICHE CATEGORIE (NUOVA LOGICA)
// Leggono dalla nuova CategoriesTable
// ============================================================================

/**
 * (RISCRITTA) Ottiene tutte le categorie da CategoriesTable
 * @returns {Promise<Array>} Array di oggetti categoria { it: '...', en: '...' }
 */
async function getCategories() {
  const operation = async () => {
    try {
      const params = {
        TableName: CATEGORIES_TABLE,
        FilterExpression: 'itemName = :metadata',
        ExpressionAttributeValues: { ':metadata': 'METADATA' },
        ProjectionExpression: 'categoryName, translations',
      };
      const response = await docClient.send(new ScanCommand(params));
      // Restituisce solo l'oggetto translations, che corrisponde al formato
      // che il frontend si aspettava dalla vecchia logica.
      return response.Items.map(item => item.translations);
    } catch (error) {
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getCategories' },
  })();
}

/**
 * (RISCRITTA) Ottiene tutte le sottocategorie globali da CategoriesTable
 * @returns {Promise<Array>} Array di oggetti sottocategoria { it: '...', en: '...' }
 */
async function getAllSubcategories() {
  const operation = async () => {
    try {
      const params = {
        TableName: CATEGORIES_TABLE,
        FilterExpression: 'begins_with(itemName, :subPrefix)',
        ExpressionAttributeValues: { ':subPrefix': 'SUB#' },
        ProjectionExpression: 'itemName, translations, categoryName',
      };
      const response = await docClient.send(new ScanCommand(params));
      // Restituisce solo l'oggetto translations
      return response.Items.map(item => item.translations);
    } catch (error) {
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getAllSubcategories' },
  })();
}

// Incolla questa funzione in dynamodb.js
async function getCategoryById(categoryName) {
  const operation = async () => {
    try {
      const params = {
        TableName: CATEGORIES_TABLE,
        Key: {
          categoryName: categoryName,
          itemName: 'METADATA',
        },
        ProjectionExpression: 'categoryName, translations',
      };
      const response = await docClient.send(new GetCommand(params));
      if (!response.Item) {
        throw new NotFoundError(`Category ${categoryName} not found`);
      }
      return response.Item.translations;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getCategoryById', categoryName },
  })();
}

/**
 * (RISCRITTA) Ottiene sottocategorie per una categoria specifica da CategoriesTable
 * Questo risolve il bug 500 originale.
 * @param {string} categoria - Nome Categoria (PK)
 * @returns {Promise<Array>} Array di oggetti sottocategoria { it: '...', en: '...' }
 */
async function getSubcategories(categoria) {
  const operation = async () => {
    try {
      const params = {
        TableName: CATEGORIES_TABLE,
        KeyConditionExpression: 'categoryName = :category AND begins_with(itemName, :subPrefix)',
        ExpressionAttributeValues: {
          ':category': categoria,
          ':subPrefix': 'SUB#',
        },
        ProjectionExpression: 'itemName, translations',
      };
      const response = await docClient.send(new QueryCommand(params));
      // Restituisce solo l'oggetto translations
      return response.Items.map(item => item.translations);
    } catch (error) {
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'getSubcategories', categoria },
  })();
}

// ============================================================================
// FUNZIONI ADMIN CATEGORIE (NUOVE)
// Scrivono sulla nuova CategoriesTable
// ============================================================================

/**
 * (NUOVA) Crea la voce 'METADATA' per una categoria.
 * @param {string} categoryName - Nome Categoria (PK)
 * @param {Object} translations - Oggetto traduzioni { it: '...', en: '...' }
 * @returns {Promise<Object>} Item creato
 */
async function adminCreateCategory(categoryName, translations) {
  const operation = async () => {
    const item = {
      categoryName: categoryName,
      itemName: 'METADATA', // Voce principale per la categoria
      translations: translations,
    };
    try {
      await docClient.send(new PutCommand({
        TableName: CATEGORIES_TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(categoryName)',
      }));
      return item;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ConflictError(`Category ${categoryName} already exists`);
      }
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'adminCreateCategory', categoryName },
  })();
}

/**
 * (NUOVA) Aggiunge o aggiorna una sottocategoria per una categoria.
 * @param {string} categoryName - Nome Categoria (PK)
 * @param {string} subcategoryName - Nome Sottocategoria (parte della SK)
 * @param {Object} translations - Oggetto traduzioni
 * @returns {Promise<Object>} Item creato/aggiornato
 */
async function adminAddSubcategory(categoryName, subcategoryName, translations) {
  const operation = async () => {
    const item = {
      categoryName: categoryName,
      itemName: `SUB#${subcategoryName}`, // Prefisso per la sottocategoria (SK)
      translations: translations,
    };
    try {
      await docClient.send(new PutCommand({
        TableName: CATEGORIES_TABLE,
        Item: item,
      })); // PutItem sovrascrive, quindi funge da "create" e "update"
      return item;
    } catch (error) {
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'adminAddSubcategory', categoryName, subcategoryName },
  })();
}

/**
 * (NUOVA) Elimina una sottocategoria.
 * @param {string} categoryName - Nome Categoria (PK)
 * @param {string} subcategoryName - Nome Sottocategoria (parte della SK)
 * @returns {Promise<void>}
 */
async function adminDeleteSubcategory(categoryName, subcategoryName) {
  const operation = async () => {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: CATEGORIES_TABLE,
          Key: {
            categoryName: categoryName,
            itemName: `SUB#${subcategoryName}`,
          },
          ConditionExpression: 'attribute_exists(itemName)',
        })
      );
    } catch (error)
    {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundError(`Subcategory ${subcategoryName} not found in ${categoryName}`);
      }
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'adminDeleteSubcategory', categoryName, subcategoryName },
  })();
}


async function adminUpdateCategory(categoryName, translations) {
  const operation = async () => {
    try {
      const params = {
        TableName: CATEGORIES_TABLE,
        Key: {
          categoryName: categoryName,
          itemName: 'METADATA',
        },
        UpdateExpression: 'SET translations = :trans',
        ExpressionAttributeValues: {
          ':trans': translations,
        },
        ConditionExpression: 'attribute_exists(itemName)',
        ReturnValues: 'ALL_NEW',
      };
      const data = await docClient.send(new UpdateCommand(params));
      return data.Attributes;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundError(`Category ${categoryName} not found`);
      }
      throw handleAWSError(error);
    }
  };
  return withRetry(operation, {
    context: { operation: 'adminUpdateCategory', categoryName },
  })();
}

/**
 * (NUOVA) Elimina un'intera categoria, incluse tutte le sue sottocategorie.
 * Esegue una query per trovare tutti gli item e poi li elimina in batch.
 */
async function adminDeleteCategory(categoryName) {
  const operation = async () => {
    // 1. Trova tutti gli item per questa categoria (METADATA e SUB#*)
    const queryParams = {
      TableName: CATEGORIES_TABLE,
      KeyConditionExpression: 'categoryName = :category',
      ExpressionAttributeValues: {
        ':category': categoryName,
      },
    };
    
    let itemsToDelete;
    try {
      const queryResult = await docClient.send(new QueryCommand(queryParams));
      itemsToDelete = queryResult.Items;
    } catch (error) {
      throw handleAWSError(error);
    }

    if (!itemsToDelete || itemsToDelete.length === 0) {
      throw new NotFoundError(`Category ${categoryName} not found or has no items`);
    }

    // 2. Prepara le richieste di eliminazione
    // Nota: BatchWriteCommand è più efficiente per eliminazioni multiple
    const deleteRequests = itemsToDelete.map(item => ({
      DeleteRequest: {
        Key: {
          categoryName: item.categoryName,
          itemName: item.itemName,
        },
      },
    }));

    // 3. Esegui la BatchWriteCommand
    // (Divide in batch da 25 se necessario, anche se qui è improbabile)
    const batchParams = {
      RequestItems: {
        [CATEGORIES_TABLE]: deleteRequests,
      },
    };
    
    try {
      await docClient.send(new BatchWriteCommand(batchParams));
      return { message: `${itemsToDelete.length} items deleted for category ${categoryName}` };
    } catch (error) {
      throw handleAWSError(error);
    }
  };
  
  // Usiamo un timeout più lungo per questa operazione complessa
  return withRetry(operation, {
    context: { operation: 'adminDeleteCategory', categoryName },
    maxAttempts: 2, 
  })();
}

// =il ===========================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Funzioni Prodotto (Esistenti)
  createProduct,
  getProductById,
  getProductByCodice,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductsByCategory,
  getProductsByCategoryAndSubcategory,

  // Funzioni Categorie Pubbliche (Riscritte)
  getCategories,
  getCategoryById,
  getSubcategories,
  getAllSubcategories,

  // Funzioni Categorie Admin (Nuove)
  adminCreateCategory,
  adminAddSubcategory,
  adminUpdateCategory,
  adminDeleteSubcategory,
  adminDeleteCategory,
};