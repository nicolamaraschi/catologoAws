# Sistema di Caching - Frontend Catalogo

## 📦 Panoramica

Il sistema di caching è progettato per ridurre il numero di chiamate API e migliorare le performance dell'applicazione. I dati vengono salvati in `localStorage` con un tempo di vita (TTL) di **10 minuti**.

## 🎯 Vantaggi

- ✅ **Caricamento Istantaneo**: I dati vengono recuperati dal localStorage invece che dall'API
- ✅ **Riduzione Carico Server**: Meno richieste HTTP al backend
- ✅ **Esperienza Utente Migliore**: Navigazione più fluida senza attese
- ✅ **Risparmio Banda**: Riduzione del traffico di rete
- ✅ **Offline-First**: Dati disponibili anche con connessione intermittente

## 🔧 Come Funziona

### 1. Prima Richiesta
```
User → API Request → Server → Response → Cache + Display
```

### 2. Richieste Successive (entro 10 minuti)
```
User → Cache Check → Display (NO API CALL!)
```

### 3. Dopo 10 Minuti
```
User → Cache Expired → API Request → Server → Response → Cache Update + Display
```

## 📁 File Coinvolti

### `cacheService.js`
Servizio generico per la gestione della cache con TTL.

**Metodi principali:**
- `set(key, data, ttl)` - Salva dati in cache
- `get(key)` - Recupera dati dalla cache (null se scaduti)
- `remove(key)` - Rimuove un elemento
- `clearAll()` - Pulisce tutta la cache
- `isValid(key)` - Verifica se un elemento è ancora valido
- `getCacheAge(key)` - Ottiene l'età della cache in secondi

### `productService.js` (Aggiornato)
Tutti i metodi ora usano la cache:
- `getAllProducts(lang, forceRefresh)` - Cache key: `products_all_{lang}`
- `getProductById(productId, lang, forceRefresh)` - Cache key: `product_{id}_{lang}`
- `getProductsByCategory(category, lang, forceRefresh)` - Cache key: `products_category_{category}_{lang}`
- `getProductsBySubcategory(category, subcategory, lang, forceRefresh)` - Cache key: `products_subcategory_{category}_{subcategory}_{lang}`

**Nuovi metodi:**
- `clearCache()` - Pulisce tutta la cache dei prodotti
- `refreshAllProducts(lang)` - Forza il refresh di tutti i prodotti

### `categoryService.js` (Aggiornato)
Tutti i metodi ora usano la cache:
- `getAllCategories(lang, forceRefresh)` - Cache key: `categories_all_{lang}`
- `getCategoryById(categoryId, lang, forceRefresh)` - Cache key: `category_{id}_{lang}`
- `getAllSubcategories(lang, forceRefresh)` - Cache key: `subcategories_all_{lang}`
- `getSubcategoriesByCategory(category, lang, forceRefresh)` - Cache key: `subcategories_category_{category}_{lang}`
- `getCategoryStructure(lang, forceRefresh)` - Cache key: `category_structure_{lang}`

**Nuovo metodo:**
- `clearCache()` - Pulisce tutta la cache delle categorie

## 🚀 Utilizzo

### Uso Normale (con cache)
```javascript
// I dati verranno presi dalla cache se disponibili e non scaduti
const products = await productService.getAllProducts('it');
```

### Forzare il Refresh
```javascript
// Ignora la cache e fa una nuova chiamata API
const products = await productService.getAllProducts('it', true);
```

### Pulire la Cache
```javascript
// Pulisce tutta la cache dei prodotti
productService.clearCache();

// Pulisce tutta la cache delle categorie
categoryService.clearCache();

// Pulisce TUTTA la cache del catalogo
import cacheService from './services/cacheService';
cacheService.clearAll();
```

## ⏱️ Tempo di Vita (TTL)

Il TTL è configurato a **10 minuti** (600.000 ms) per tutti i dati.

Per modificarlo, cambia la costante nei file service:

```javascript
const CACHE_TTL = 10 * 60 * 1000; // 10 minuti
```

## 🔍 Debugging

Tutti i servizi loggano in console quando:
- ✅ **Cache Hit**: `📦 Using cached data`
- ⏰ **Cache Miss/Expired**: `⏰ Cache expired` o `ℹ️ Cache miss`
- 🔍 **API Call**: `🔍 Fetching from API...`
- 💾 **Cache Save**: `✅ Cache saved`

### Esempio Log
```
📦 ProductService: Using cached products
// oppure
⏰ Cache expired: products_all_it (age: 612s)
🔍 ProductService: Fetching all products from API...
✅ ProductService: Products fetched: 45 items
✅ Cache saved: products_all_it (TTL: 600s)
```

## 🛠️ Console Commands

Puoi anche gestire la cache dalla console del browser:

```javascript
// Importa il servizio (solo in dev mode)
import cacheService from './services/cacheService';

// Verifica se una cache è valida
cacheService.isValid('products_all_it');

// Controlla l'età della cache
cacheService.getCacheAge('products_all_it'); // ritorna secondi

// Pulisce tutto
cacheService.clearAll();
```

## 📊 Monitoraggio Storage

Per vedere cosa è salvato in localStorage:

```javascript
// Console del browser
Object.keys(localStorage)
  .filter(key => key.startsWith('catalogo_cache_'))
  .forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(key, {
      age: Math.round((Date.now() - data.timestamp) / 1000) + 's',
      ttl: data.ttl / 1000 + 's',
      size: JSON.stringify(data.data).length + ' bytes'
    });
  });
```

## ⚠️ Limitazioni

1. **localStorage Limit**: Tipicamente 5-10 MB per dominio
2. **Solo Dati GET**: Non cacheare dati sensibili o che cambiano frequentemente
3. **Cambio Lingua**: Cache separata per ogni lingua

## 🔄 Invalidazione Cache

La cache viene invalidata automaticamente:
- ⏰ Dopo 10 minuti dal salvataggio
- 🗑️ Quando si chiama `.clearCache()`
- 🔄 Quando si passa `forceRefresh = true`

## 💡 Best Practices

1. **Non forzare il refresh** a meno che non sia necessario
2. **Usa `clearCache()`** dopo operazioni CRUD (create, update, delete)
3. **Monitora i log** in console per verificare il funzionamento
4. **Testa in incognito** per verificare il comportamento senza cache

## 🐛 Troubleshooting

### La cache non funziona?
1. Controlla che localStorage sia abilitato nel browser
2. Verifica i log in console
3. Controlla che non ci siano errori di parsing JSON

### Dati obsoleti?
1. Chiama `clearCache()` per forzare il refresh
2. Verifica il TTL configurato
3. Apri la console e controlla l'età della cache

### localStorage pieno?
Il servizio gestisce automaticamente gli errori di storage pieno, semplicemente non salva in cache e continua a usare l'API.

## 📈 Performance

**Prima del caching:**
- Ogni navigazione = 1-3 chiamate API
- Tempo caricamento: 500-2000ms

**Dopo il caching:**
- Prima navigazione = 1-3 chiamate API
- Navigazioni successive = 0 chiamate API
- Tempo caricamento dalla cache: 5-50ms

**Risparmio stimato:**
- 90% di richieste API in meno
- 95% di tempo di caricamento in meno
- Migliore esperienza utente
