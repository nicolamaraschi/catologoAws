/**
 * Migration Script: MongoDB Atlas → AWS DynamoDB
 * Migrates all products from MongoDB ProdottoCatalogo collection to DynamoDB
 * * --- AGGIORNATO CON CONTROLLI PRELIMINARI E DB CORRETTO ---
 *
 * Prerequisites:
 * 1. Set MONGO_URI environment variable
 * 2. Configure AWS credentials
 * 3. Deploy CloudFormation stack first to create DynamoDB table
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
// AGGIUNTO DescribeTableCommand per il controllo preliminare
const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Configuration
const MONGO_URI = process.env.MONGO_URI;
// Rimosso il default 'CatalogoProducts' per fare affidamento solo sul .env
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const BATCH_SIZE = 25; // DynamoDB BatchWrite limit

// Validate environment variables
if (!MONGO_URI || !PRODUCTS_TABLE) {
  console.error('ERROR: MONGO_URI and PRODUCTS_TABLE environment variables are required');
  process.exit(1);
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Connect to MongoDB
 */
async function connectToMongoDB() {
  // I log sono ora nella funzione 'migrateData'
  const client = new MongoClient(MONGO_URI);
  await client.connect();
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

    // Rimosso il log "Batch write successful" per ridurre il rumore
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
    console.log('MongoDB to DynamoDB Migration Script (CON CONTROLLI)');
    console.log('='.repeat(60));
    console.log(`Source: MongoDB Atlas (${MONGO_URI.split('@')[1] || '...'})`);
    console.log(`Target: DynamoDB Table "${PRODUCTS_TABLE}" in ${AWS_REGION}`);
    console.log('='.repeat(60));

    // --- CONTROLLO 1: Accesso a DynamoDB Table ---
    console.log('\n📦 [1/2] Verifying DynamoDB Table access...');
    await dynamoClient.send(new DescribeTableCommand({ TableName: PRODUCTS_TABLE }));
    console.log(`✓ DynamoDB Table access verified (${PRODUCTS_TABLE})`);

    // --- CONTROLLO 2: Connessione a MongoDB ---
    console.log('\n📦 [2/2] Connecting to MongoDB Atlas...');
    mongoClient = await connectToMongoDB();
    console.log('✓ Connected to MongoDB');

    console.log('\n' + '='.repeat(60));
    console.log('✓ PREFLIGHT CHECKS PASSED. Starting migration...');
    console.log('='.repeat(60));


    // --- MODIFICA CHIAVE QUI ---
    // Specifica il database "test"
    const db = mongoClient.db('test'); 
    // Specifica la collezione corretta
    const collection = db.collection('prodottocatalogos');
    // --- FINE MODIFICA ---


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
    console.log('\nWriting to DynamoDB in batches (25 items)...');
    let processedCount = 0;

    for (let i = 0; i < transformedProducts.length; i += BATCH_SIZE) {
      const batch = transformedProducts.slice(i, i + BATCH_SIZE);
      await batchWriteToDynamoDB(batch);
      processedCount += batch.length;

      const progress = ((processedCount / transformedProducts.length) * 100).toFixed(2);
      process.stdout.write(`Progress: ${processedCount}/${transformedProducts.length} (${progress}%) \r`);

      // Rate limiting to avoid throttling
      if (i + BATCH_SIZE < transformedProducts.length) {
        await sleep(200);
      }
    }

    console.log(`\n\n✓ Batch write successful: ${processedCount} items`);
    console.log('\n' + '='.repeat(60));
    console.log('✓ DATA MIGRATION COMPLETED SUCCESSFULLY!');
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