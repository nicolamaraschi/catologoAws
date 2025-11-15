require('dotenv').config();
const { MongoClient } = require('mongodb');

// --- CONFIGURAZIONE DELLO SCRIPT ---
// Questi devono corrispondere al tuo .env e ai nostri script
const MONGO_URI = process.env.MONGO_URI;
const DATABASE_NAME = 'test';
const COLLECTION_NAME = 'prodottocatalogos';

// Questa è la query esatta che fallisce
const QUERY = { "immagini.0": { $exists: true } };
// --- FINE CONFIGURAZIONE ---


async function runQuery() {
  if (!MONGO_URI) {
    console.error('ERRORE: MONGO_URI non trovato nel file .env!');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  console.log(` Tentativo di connessione a: ${MONGO_URI.split('@')[1]}`);

  try {
    await client.connect();
    console.log("✓ Connessione a MongoDB riuscita!");

    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    console.log(` Eseguo la query sul database "${DATABASE_NAME}", collezione "${COLLECTION_NAME}"...`);
    
    // Eseguiamo la query che ci dà problemi
    const productsWithImages = await collection.find(QUERY).toArray();

    if (productsWithImages.length > 0) {
      console.log(`\n🎉 TROVATI! Risultato: ${productsWithImages.length} prodotti con immagini:`);
      // Stampa i codici dei prodotti trovati
      productsWithImages.forEach(p => {
        console.log(`  - Codice: ${p.codice}, Immagini: ${p.immagini.length}`);
      });
    } else {
      console.log('\n❌ FALLITO. Risultato: 0 prodotti trovati con questa query.');
      console.log('Questo conferma che lo script Node.js non "vede" i dati che ti aspetti.');
    }

  } catch (error) {
    console.error('\n✗ ERRORE DI CONNESSIONE O QUERY:', error);
  } finally {
    await client.close();
    console.log('\n✓ Connessione chiusa.');
  }
}

runQuery();