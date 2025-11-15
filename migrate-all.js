/**
 * Migration Script: Cloudinary Images → AWS S3
 * Downloads images from Cloudinary and uploads to S3
 * * --- AGGIORNATO CON LOGICA A 2 FASI PER EVITARE CONFLITTI DI DIPENDENZE ---
 */

// --- FASE 1: SOLO OPERAZIONI MONGODB ---

require('dotenv').config();
const { MongoClient } = require('mongodb');

/**
 * Fase 1: Carica tutti i dati necessari da MongoDB.
 * Non carica nessun'altra libreria (AWS, axios) per evitare conflitti.
 */
async function fetchMongoData() {
  console.log('='.repeat(70));
  console.log('CLOUDINARY → S3 IMAGE MIGRATION (FASE 1: FETCH MONGO)');
  console.log('='.repeat(70));

  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('ERRORE: MONGO_URI non trovato in .env');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  console.log(` Tentativo di connessione a: ${MONGO_URI.split('@')[1]}`);

  try {
    await client.connect();
    console.log("✓ Connessione a MongoDB riuscita!");

    const db = client.db('test');
    const collection = db.collection('prodottocatalogos');
    
    // La query che sappiamo essere corretta
    const query = { "immagini.0": { $exists: true } };
    
    console.log(' Eseguo la query per prodotti con immagini...');
    const products = await collection.find(query).toArray();

    if (products.length > 0) {
      console.log(`\n🎉 TROVATI! Risultato: ${products.length} prodotti con immagini pronti per AWS.`);
    } else {
      console.log('\n❌ ATTENZIONE: 0 prodotti trovati con immagini in MongoDB. Lo script si fermerà.');
    }
    return products; // Ritorna l'array di prodotti

  } catch (error) {
    console.error('\n✗ ERRORE DURANTE LA FASE 1 (MONGO):', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Connessione a MongoDB chiusa. Inizio Fase 2 (AWS).\n');
  }
}


// --- FASE 2: SOLO OPERAZIONI AWS E DOWNLOAD ---

// Ora possiamo caricare in sicurezza le altre librerie
const { S3Client, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

// --- Riconfigura le costanti per la Fase 2 ---
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const UPDATE_DYNAMODB = process.env.UPDATE_DYNAMODB === 'true';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// --- Inizializza i client AWS (ora sicuri) ---
const s3Client = new S3Client({ region: AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Stats
let stats = {
  totalProducts: 0,
  totalImages: 0,
  successImages: 0,
  failedImages: 0,
  skippedImages: 0
};

// ... (Tutte le funzioni helper rimangono invariate) ...

async function downloadImage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`    Downloading (attempt ${i + 1}/${retries})...`);
      const config = { 
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      };
      if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
        config.headers['Authorization'] = `Basic ${auth}`;
      }
      const response = await axios.get(url, config);
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`    Retry after error: ${error.message}`);
      await sleep(1000 * (i + 1));
    }
  }
}

async function uploadToS3(imageBuffer, fileName, contentType) {
  const key = `products/${fileName}`;
  await s3Client.send(new PutObjectCommand({
    Bucket: IMAGES_BUCKET,
    Key: key,
    Body: imageBuffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000, public, immutable',
  }));
  return `https://${IMAGES_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

function getContentType(url, buffer = null) {
  if (buffer) {
    const header = buffer.slice(0, 12).toString('hex');
    if (header.startsWith('ffd8ff')) return 'image/jpeg';
    if (header.startsWith('89504e47')) return 'image/png';
    if (header.startsWith('47494638')) return 'image/gif';
    if (header.startsWith('52494646') && header.includes('57454250')) return 'image/webp';
  }
  const ext = path.extname(url.split('?')[0]).toLowerCase();
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  return types[ext] || 'image/jpeg';
}

function generateFileName(productCode, index, url) {
  const ext = path.extname(url.split('?')[0]) || '.jpg';
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
  return `${productCode}-${index}-${hash}${ext}`.replace(/[^a-zA-Z0-9.-]/g, '_');
}

async function getProductByMongoId(mongoId) {
  const result = await docClient.send(new ScanCommand({
    TableName: PRODUCTS_TABLE,
    FilterExpression: 'mongoId = :mongoId',
    ExpressionAttributeValues: { ':mongoId': mongoId },
    Limit: 1
  }));
  return result.Items?.[0] || null;
}

async function updateProductImages(productId, s3Urls) {
  await docClient.send(new UpdateCommand({
    TableName: PRODUCTS_TABLE,
    Key: { productId },
    UpdateExpression: 'SET immagini = :immagini, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':immagini': s3Urls,
      ':updatedAt': new Date().toISOString()
    }
  }));
}

async function processProduct(product, index, total) {
  console.log(`\n[${ index + 1}/${total}] Product: ${product.codice}`);
  const oldUrls = product.immagini || [];
  if (oldUrls.length === 0) {
    console.log('  No images to migrate');
    stats.skippedImages++;
    return;
  }
  console.log(`  Found ${oldUrls.length} image(s)`);
  const newUrls = [];
  for (let i = 0; i < oldUrls.length; i++) {
    const oldUrl = oldUrls[i];
    stats.totalImages++;
    if (oldUrl.includes('.s3.') || oldUrl.includes('cloudfront.net')) {
      console.log(`  Image ${i + 1}: Already on S3, skipping`);
      newUrls.push(oldUrl);
      stats.skippedImages++;
      continue;
    }
    try {
      console.log(`  Image ${i + 1}/${oldUrls.length}:`);
      console.log(`    URL: ${oldUrl.substring(0, 60)}...`);
      const imageBuffer = await downloadImage(oldUrl);
      console.log(`    ✓ Downloaded (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
      const contentType = getContentType(oldUrl, imageBuffer);
      const fileName = generateFileName(product.codice, i, oldUrl);
      console.log(`    Uploading to S3...`);
      const s3Url = await uploadToS3(imageBuffer, fileName, contentType);
      newUrls.push(s3Url);
      console.log(`    ✓ Uploaded: ${fileName}`);
      stats.successImages++;
      await sleep(300);
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
      stats.failedImages++;
      newUrls.push(oldUrl);
    }
  }
  if (UPDATE_DYNAMODB && newUrls.length > 0) {
    try {
      const dynamoProduct = await getProductByMongoId(product._id.toString());
      if (dynamoProduct) {
        console.log(`  Updating DynamoDB (productId: ${dynamoProduct.productId})...`);
        await updateProductImages(dynamoProduct.productId, newUrls);
        console.log(`  ✓ DynamoDB updated`);
      } else {
        console.log(`  ⚠ Product not found in DynamoDB (MongoID: ${product._id.toString()}), skipping update`);
      }
    } catch (error) {
      console.error(`  ✗ DynamoDB update failed: ${error.message}`);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Funzione Principale (Wrapper)
 * Esegue la Fase 1, poi passa i risultati alla Fase 2.
 */
async function runFullMigration() {
  
  // FASE 1:
  const productsToMigrate = await fetchMongoData();

  if (!productsToMigrate || productsToMigrate.length === 0) {
    console.log("Nessun prodotto con immagini trovato. Migrazione terminata.");
    process.exit(0);
  }

  // FASE 2:
  console.log('='.repeat(70));
  console.log(`CLOUDINARY → S3 IMAGE MIGRATION (FASE 2: PROCESSO AWS per ${productsToMigrate.length} prodotti)`);
  console.log('='.repeat(70));
  console.log(`S3 Bucket: ${IMAGES_BUCKET}`);
  console.log(`DynamoDB Table: ${PRODUCTS_TABLE}`);
  console.log(`Update DynamoDB: ${UPDATE_DYNAMODB ? 'YES' : 'NO'}`);
  console.log('='.repeat(70));

  const startTime = Date.now();
  stats.totalProducts = productsToMigrate.length;

  try {
    // --- CONTROLLO AWS 1: Accesso a S3 Bucket ---
    console.log('\n📦 [1/2] Verifying S3 Bucket access...');
    await s3Client.send(new HeadBucketCommand({ Bucket: IMAGES_BUCKET }));
    console.log(`✓ S3 Bucket access verified (${IMAGES_BUCKET})`);

    // --- CONTROLLO AWS 2: Accesso a DynamoDB Table ---
    console.log('\n📦 [2/2] Verifying DynamoDB Table access...');
    await dynamoClient.send(new DescribeTableCommand({ TableName: PRODUCTS_TABLE }));
    console.log(`✓ DynamoDB Table access verified (${PRODUCTS_TABLE})`);

    console.log('\n' + '='.repeat(70));
    console.log('✓ PREFLIGHT CHECKS AWS PASSATI. Starting image processing...');
    console.log('='.repeat(70));

    // Processa ogni prodotto dall'array in memoria
    for (let i = 0; i < productsToMigrate.length; i++) {
      await processProduct(productsToMigrate[i], i, productsToMigrate.length);
    }

    // --- Summary ---
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(70));
    console.log('✓ MIGRATION COMPLETED');
    console.log('='.repeat(70));
    console.log(`Duration: ${duration}s`);
    console.log(`Products processed: ${stats.totalProducts}`);
    console.log(`Total images: ${stats.totalImages}`);
    console.log(`Successfully migrated: ${stats.successImages}`);
    console.log(`Skipped (already S3): ${stats.skippedImages}`);
    console.log(`Failed: ${stats.failedImages}`);
    console.log('='.repeat(70));
    if (stats.failedImages > 0) {
      console.log('\n⚠️  Some images failed to migrate. Check logs above for details.');
    }

  } catch (error) {
    console.error('\n✗ MIGRATION FAILED DURING FASE 2 (AWS)');
    console.error(error);
    process.exit(1);
  }
}

// Esegui la migrazione completa
runFullMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error in migration wrapper:', error);
    process.exit(1);
  });