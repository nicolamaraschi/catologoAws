/**
 * Migration Script: MongoDB Atlas → AWS DynamoDB
 * Migrates all products from MongoDB ProdottoCatalogo collection to DynamoDB
 *
 * Prerequisites:
 * 1. Set MONGO_URI environment variable
 * 2. Configure AWS credentials
 * 3. Deploy CloudFormation stack first to create DynamoDB table
 *
 * Usage:
 *   MONGO_URI=mongodb+srv://... AWS_REGION=eu-west-1 PRODUCTS_TABLE=YourTableName node scripts/migrate-mongodb-to-dynamodb.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Configuration
const MONGO_URI = process.env.MONGO_URI;
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'CatalogoProducts';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const BATCH_SIZE = 25; // DynamoDB BatchWrite limit

// Validate environment variables
if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI environment variable is required');
  process.exit(1);
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('✓ Connected to MongoDB');
  return client;
}

/**
 * Transform MongoDB document to DynamoDB item
 */
function transformProduct(mongoProduct) {
  // Calculate pezziPerEpal
  const pezziPerEpal =
    mongoProduct.pezziPerCartone && mongoProduct.cartoniPerEpal
      ? mongoProduct.pezziPerCartone * mongoProduct.cartoniPerEpal
      : null;

  // Create DynamoDB item
  const dynamoItem = {
    productId: uuidv4(),
    codice: mongoProduct.codice,
    nome: mongoProduct.nome || { it: '', en: '', fr: '', es: '', de: '' },
    tipo: mongoProduct.tipo || '',
    prezzo: mongoProduct.prezzo || 0,
    unita: mongoProduct.unita || '€/PZ',
    categoria: mongoProduct.categoria || { it: '', en: '', fr: '', es: '', de: '' },
    sottocategoria: mongoProduct.sottocategoria || { it: '', en: '', fr: '', es: '', de: '' },
    tipoImballaggio: mongoProduct.tipoImballaggio || '',
    pezziPerCartone: mongoProduct.pezziPerCartone || null,
    cartoniPerEpal: mongoProduct.cartoniPerEpal || null,
    pezziPerEpal,
    descrizione: mongoProduct.descrizione || { it: '', en: '', fr: '', es: '', de: '' },
    immagini: mongoProduct.immagini || [],

    // Add categoriaIt for GSI
    categoriaIt: mongoProduct.categoria?.it || '',

    // Timestamps
    createdAt: mongoProduct.createdAt
      ? new Date(mongoProduct.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Migration metadata
    migratedFrom: 'MongoDB',
    mongoId: mongoProduct._id.toString(),
    migratedAt: new Date().toISOString(),
  };

  return dynamoItem;
}

/**
 * Batch write items to DynamoDB
 */
async function batchWriteToDynamoDB(items) {
  if (items.length === 0) return;

  const putRequests = items.map((item) => ({
    PutRequest: {
      Item: item,
    },
  }));

  const params = {
    RequestItems: {
      [PRODUCTS_TABLE]: putRequests,
    },
  };

  try {
    const result = await docClient.send(new BatchWriteCommand(params));

    // Handle unprocessed items (retry logic)
    if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
      console.warn(`⚠ ${result.UnprocessedItems[PRODUCTS_TABLE].length} items were not processed, retrying...`);

      // Exponential backoff retry
      await sleep(1000);
      const retryParams = {
        RequestItems: result.UnprocessedItems,
      };
      await docClient.send(new BatchWriteCommand(retryParams));
    }

    console.log(`✓ Batch write successful: ${items.length} items`);
  } catch (error) {
    console.error('✗ Batch write failed:', error.message);
    throw error;
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main migration function
 */
async function migrateData() {
  let mongoClient;

  try {
    console.log('='.repeat(60));
    console.log('MongoDB to DynamoDB Migration Script');
    console.log('='.repeat(60));
    console.log(`Source: MongoDB Atlas (${MONGO_URI.split('@')[1]})`);
    console.log(`Target: DynamoDB Table "${PRODUCTS_TABLE}" in ${AWS_REGION}`);
    console.log('='.repeat(60));

    // Connect to MongoDB
    mongoClient = await connectToMongoDB();
    const db = mongoClient.db();
    const collection = db.collection('prodottocatologos'); // MongoDB collection name

    // Count total documents
    const totalCount = await collection.countDocuments();
    console.log(`\nTotal products to migrate: ${totalCount}`);

    if (totalCount === 0) {
      console.log('No products found in MongoDB. Exiting.');
      return;
    }

    // Fetch all products
    console.log('\nFetching products from MongoDB...');
    const products = await collection.find({}).toArray();
    console.log(`✓ Fetched ${products.length} products`);

    // Transform products
    console.log('\nTransforming products...');
    const transformedProducts = products.map(transformProduct);
    console.log(`✓ Transformed ${transformedProducts.length} products`);

    // Batch write to DynamoDB
    console.log('\nWriting to DynamoDB in batches...');
    let processedCount = 0;

    for (let i = 0; i < transformedProducts.length; i += BATCH_SIZE) {
      const batch = transformedProducts.slice(i, i + BATCH_SIZE);
      await batchWriteToDynamoDB(batch);
      processedCount += batch.length;

      const progress = ((processedCount / transformedProducts.length) * 100).toFixed(2);
      console.log(`Progress: ${processedCount}/${transformedProducts.length} (${progress}%)`);

      // Rate limiting to avoid throttling
      if (i + BATCH_SIZE < transformedProducts.length) {
        await sleep(200);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`Total products migrated: ${processedCount}`);
    console.log(`DynamoDB Table: ${PRODUCTS_TABLE}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '✗'.repeat(60));
    console.error('Migration failed with error:');
    console.error(error);
    console.error('✗'.repeat(60));
    process.exit(1);
  } finally {
    // Close MongoDB connection
    if (mongoClient) {
      await mongoClient.close();
      console.log('\n✓ MongoDB connection closed');
    }
  }
}

/**
 * Verification function (optional)
 */
async function verifyMigration() {
  console.log('\nVerifying migration...');

  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
        Select: 'COUNT',
      })
    );

    console.log(`✓ DynamoDB Table "${PRODUCTS_TABLE}" contains ${result.Count} items`);
    return result.Count;
  } catch (error) {
    console.error('✗ Verification failed:', error.message);
    return 0;
  }
}

// Run migration
(async () => {
  try {
    await migrateData();
    await verifyMigration();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
