/**
 * Migration Script: Cloudinary Images → AWS S3
 * Downloads images from Cloudinary and uploads to S3
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');

// Configuration
const MONGO_URI = process.env.MONGO_URI;
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const UPDATE_DYNAMODB = process.env.UPDATE_DYNAMODB === 'true';

// Cloudinary config (optional - se le immagini sono pubbliche)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

// Validate config
if (!MONGO_URI || !PRODUCTS_TABLE || !IMAGES_BUCKET) {
  console.error('ERROR: Missing required environment variables');
  console.error('Required: MONGO_URI, PRODUCTS_TABLE, IMAGES_BUCKET');
  process.exit(1);
}

// Initialize AWS clients
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

/**
 * Download image from URL with retry
 */
async function downloadImage(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`    Downloading (attempt ${i + 1}/${retries})...`);
      
      const config = { 
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      };

      // Add Cloudinary auth if available
      if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
        config.headers['Authorization'] = `Basic ${auth}`;
      }

      const response = await axios.get(url, config);
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`    Retry after error: ${error.message}`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}

/**
 * Upload image to S3
 */
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

/**
 * Get content type from URL or buffer
 */
function getContentType(url, buffer = null) {
  // Try to detect from buffer first (more reliable)
  if (buffer) {
    const header = buffer.slice(0, 12).toString('hex');
    if (header.startsWith('ffd8ff')) return 'image/jpeg';
    if (header.startsWith('89504e47')) return 'image/png';
    if (header.startsWith('47494638')) return 'image/gif';
    if (header.startsWith('52494646') && header.includes('57454250')) return 'image/webp';
  }

  // Fallback to extension
  const ext = path.extname(url.split('?')[0]).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return types[ext] || 'image/jpeg';
}

/**
 * Generate unique filename
 */
function generateFileName(productCode, index, url) {
  const ext = path.extname(url.split('?')[0]) || '.jpg';
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
  return `${productCode}-${index}-${hash}${ext}`.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Get product from DynamoDB by MongoDB ID
 */
async function getProductByMongoId(mongoId) {
  // In the migration script, we stored mongoId in the product
  // We need to scan to find it (not efficient but works for migration)
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  const result = await docClient.send(new ScanCommand({
    TableName: PRODUCTS_TABLE,
    FilterExpression: 'mongoId = :mongoId',
    ExpressionAttributeValues: {
      ':mongoId': mongoId
    },
    Limit: 1
  }));

  return result.Items?.[0] || null;
}

/**
 * Update product images in DynamoDB
 */
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

/**
 * Process single product
 */
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

    // Skip if already S3 URL
    if (oldUrl.includes('.s3.') || oldUrl.includes('cloudfront.net')) {
      console.log(`  Image ${i + 1}: Already on S3, skipping`);
      newUrls.push(oldUrl);
      stats.skippedImages++;
      continue;
    }

    try {
      console.log(`  Image ${i + 1}/${oldUrls.length}:`);
      console.log(`    URL: ${oldUrl.substring(0, 60)}...`);

      // Download from Cloudinary
      const imageBuffer = await downloadImage(oldUrl);
      console.log(`    ✓ Downloaded (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

      // Detect content type
      const contentType = getContentType(oldUrl, imageBuffer);
      
      // Generate filename
      const fileName = generateFileName(product.codice, i, oldUrl);

      // Upload to S3
      console.log(`    Uploading to S3...`);
      const s3Url = await uploadToS3(imageBuffer, fileName, contentType);
      newUrls.push(s3Url);
      
      console.log(`    ✓ Uploaded: ${fileName}`);
      stats.successImages++;

      // Rate limiting to avoid overwhelming S3
      await sleep(300);

    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
      stats.failedImages++;
      // Keep old URL as fallback
      newUrls.push(oldUrl);
    }
  }

  // Update DynamoDB if enabled
  if (UPDATE_DYNAMODB && newUrls.length > 0) {
    try {
      // Find product in DynamoDB by mongoId
      const dynamoProduct = await getProductByMongoId(product._id.toString());
      
      if (dynamoProduct) {
        console.log(`  Updating DynamoDB (productId: ${dynamoProduct.productId})...`);
        await updateProductImages(dynamoProduct.productId, newUrls);
        console.log(`  ✓ DynamoDB updated`);
      } else {
        console.log(`  ⚠ Product not found in DynamoDB, skipping update`);
      }
    } catch (error) {
      console.error(`  ✗ DynamoDB update failed: ${error.message}`);
    }
  }
}

/**
 * Main migration function
 */
async function migrateImages() {
  console.log('='.repeat(70));
  console.log('CLOUDINARY → S3 IMAGE MIGRATION');
  console.log('='.repeat(70));
  console.log(`MongoDB: ${MONGO_URI.split('@')[1]}`);
  console.log(`S3 Bucket: ${IMAGES_BUCKET}`);
  console.log(`DynamoDB Table: ${PRODUCTS_TABLE}`);
  console.log(`Update DynamoDB: ${UPDATE_DYNAMODB ? 'YES' : 'NO'}`);
  console.log('='.repeat(70));

  let mongoClient;
  const startTime = Date.now();

  try {
    // Connect to MongoDB
    console.log('\n📦 Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    console.log('✓ Connected to MongoDB');

    const db = mongoClient.db();
    const collection = db.collection('prodottocatologos');

    // Get products with images
    const products = await collection.find({ 
      immagini: { $exists: true, $ne: [], $ne: null } 
    }).toArray();

    stats.totalProducts = products.length;
    console.log(`\n📸 Found ${products.length} products with images\n`);

    // Process each product
    for (let i = 0; i < products.length; i++) {
      await processProduct(products[i], i, products.length);
    }

    // Summary
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
    console.error('\n✗ MIGRATION FAILED');
    console.error(error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('\n✓ MongoDB connection closed');
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run migration
migrateImages()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });