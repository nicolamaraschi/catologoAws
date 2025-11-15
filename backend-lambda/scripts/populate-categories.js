/**
 * Script per estrarre categorie/sottocategorie dai prodotti esistenti
 * e popolare la CategoriesTable
 */

require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  BatchWriteCommand 
} = require('@aws-sdk/lib-dynamodb');

// Configurazione
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE;
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

// Usa il profilo dall'ambiente (export AWS_PROFILE=personale)
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Contatori per statistiche
let stats = {
  totalProducts: 0,
  categoriesFound: new Set(),
  subcategoriesFound: new Map(), // categoria -> Set di sottocategorie
  itemsCreated: 0
};

/**
 * Scansiona tutti i prodotti e estrae categorie/sottocategorie
 */
async function scanAllProducts() {
  console.log('📦 Scanning all products in ProductsTable...');
  
  const allProducts = [];
  let lastEvaluatedKey = null;
  
  do {
    const params = {
      TableName: PRODUCTS_TABLE,
      ProjectionExpression: 'categoria, sottocategoria',
      Limit: 100
    };
    
    // Aggiungi ExclusiveStartKey solo se non è null
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await docClient.send(new ScanCommand(params));
    
    if (result.Items) {
      allProducts.push(...result.Items);
      process.stdout.write(`\rScanned: ${allProducts.length} products...`);
    }
    
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`\n✓ Total products scanned: ${allProducts.length}`);
  stats.totalProducts = allProducts.length;
  
  return allProducts;
}

/**
 * Estrae categorie e sottocategorie uniche dai prodotti
 */
function extractCategoriesAndSubcategories(products) {
  console.log('\n🔍 Extracting unique categories and subcategories...');
  
  for (const product of products) {
    // Estrai categoria
    let categoriaIt = null;
    if (product.categoria) {
      // Prova formato nested { it: "Domestico" }
      if (typeof product.categoria === 'object' && product.categoria.it) {
        categoriaIt = product.categoria.it;
      }
      // Prova formato string diretto
      else if (typeof product.categoria === 'string') {
        categoriaIt = product.categoria;
      }
    }
    
    // Estrai sottocategoria
    let sottocategoriaIt = null;
    if (product.sottocategoria) {
      // Prova formato nested { it: "Piscina" }
      if (typeof product.sottocategoria === 'object' && product.sottocategoria.it) {
        sottocategoriaIt = product.sottocategoria.it;
      }
      // Prova formato string diretto
      else if (typeof product.sottocategoria === 'string') {
        sottocategoriaIt = product.sottocategoria;
      }
    }
    
    // Aggiungi categoria se trovata
    if (categoriaIt) {
      stats.categoriesFound.add(categoriaIt);
      
      // Inizializza Set per sottocategorie se non esiste
      if (!stats.subcategoriesFound.has(categoriaIt)) {
        stats.subcategoriesFound.set(categoriaIt, new Set());
      }
      
      // Aggiungi sottocategoria se trovata
      if (sottocategoriaIt) {
        stats.subcategoriesFound.get(categoriaIt).add(sottocategoriaIt);
      }
    }
  }
  
  console.log('✓ Extraction completed');
  console.log(`📁 Categories found: ${Array.from(stats.categoriesFound).join(', ')}`);
  
  for (const [categoria, sottocategorie] of stats.subcategoriesFound) {
    console.log(`📂 ${categoria}: ${sottocategorie.size} subcategories`);
    console.log(`   → ${Array.from(sottocategorie).join(', ')}`);
  }
}

/**
 * Crea gli item per CategoriesTable
 */
function createCategoryItems() {
  console.log('\n🏗️  Creating category items...');
  
  const itemsToCreate = [];
  
  // Per ogni categoria trovata
  for (const categoria of stats.categoriesFound) {
    // 1. Crea item METADATA per la categoria
    const categoryMetadata = {
      categoryName: categoria,
      itemName: 'METADATA',
      translations: {
        it: categoria,
        en: categoria === 'Domestico' ? 'Domestic' : 'Industrial',
        fr: categoria === 'Domestico' ? 'Domestique' : 'Industriel', 
        es: categoria === 'Domestico' ? 'Doméstico' : 'Industrial',
        de: categoria === 'Domestico' ? 'Haushalt' : 'Industriell'
      }
    };
    itemsToCreate.push(categoryMetadata);
    
    // 2. Crea item SUB# per ogni sottocategoria
    const sottocategorie = stats.subcategoriesFound.get(categoria);
    if (sottocategorie) {
      for (const sottocategoria of sottocategorie) {
        const subcategoryItem = {
          categoryName: categoria,
          itemName: `SUB#${sottocategoria}`,
          translations: {
            it: sottocategoria,
            en: sottocategoria, // Mantieni originale per ora
            fr: sottocategoria,
            es: sottocategoria,
            de: sottocategoria
          }
        };
        itemsToCreate.push(subcategoryItem);
      }
    }
  }
  
  console.log(`✓ Created ${itemsToCreate.length} items to insert`);
  stats.itemsCreated = itemsToCreate.length;
  
  return itemsToCreate;
}

/**
 * Scrive gli item nella CategoriesTable usando BatchWrite
 */
async function writeToCategoriesTable(items) {
  console.log('\n💾 Writing to CategoriesTable...');
  
  // BatchWrite può gestire max 25 item per volta
  const BATCH_SIZE = 25;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    const putRequests = batch.map(item => ({
      PutRequest: {
        Item: item
      }
    }));
    
    const params = {
      RequestItems: {
        [CATEGORIES_TABLE]: putRequests
      }
    };
    
    try {
      const result = await docClient.send(new BatchWriteCommand(params));
      
      // Gestisci item non processati (retry)
      if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
        console.warn(`⚠ ${result.UnprocessedItems[CATEGORIES_TABLE].length} items unprocessed, retrying...`);
        
        await sleep(1000); // Wait 1 second
        const retryParams = {
          RequestItems: result.UnprocessedItems
        };
        await docClient.send(new BatchWriteCommand(retryParams));
      }
      
      const progress = Math.min(i + BATCH_SIZE, items.length);
      process.stdout.write(`\rProgress: ${progress}/${items.length} items written`);
      
    } catch (error) {
      console.error(`\n✗ Error writing batch starting at index ${i}:`, error);
      throw error;
    }
    
    // Rate limiting
    await sleep(100);
  }
  
  console.log('\n✓ All items written successfully');
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Funzione principale
 */
async function populateCategoriesTable() {
  const startTime = Date.now();
  
  console.log('🚀 STARTING CATEGORIES EXTRACTION & MIGRATION');
  console.log('='.repeat(60));
  console.log(`Source: ${PRODUCTS_TABLE}`);
  console.log(`Target: ${CATEGORIES_TABLE}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('='.repeat(60));
  
  try {
    // 1. Scansiona tutti i prodotti
    const products = await scanAllProducts();
    
    if (products.length === 0) {
      console.log('❌ No products found in ProductsTable');
      return;
    }
    
    // 2. Estrai categorie e sottocategorie uniche
    extractCategoriesAndSubcategories(products);
    
    if (stats.categoriesFound.size === 0) {
      console.log('❌ No categories found in products');
      return;
    }
    
    // 3. Crea gli item per CategoriesTable
    const itemsToCreate = createCategoryItems();
    
    // 4. Scrivi nella CategoriesTable
    await writeToCategoriesTable(itemsToCreate);
    
    // 5. Statistiche finali
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📦 Products scanned: ${stats.totalProducts}`);
    console.log(`📁 Categories found: ${stats.categoriesFound.size}`);
    
    let totalSubcategories = 0;
    for (const sottocategorie of stats.subcategoriesFound.values()) {
      totalSubcategories += sottocategorie.size;
    }
    console.log(`📂 Subcategories found: ${totalSubcategories}`);
    console.log(`💾 Total items created: ${stats.itemsCreated}`);
    console.log('='.repeat(60));
    
    console.log('\n🎯 Next steps:');
    console.log('1. Run your API tests again');
    console.log('2. Check: GET /api/public/catalogo/categorie');
    console.log('3. Check: GET /api/public/catalogo/sottocategorie');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Esegui lo script
populateCategoriesTable()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });