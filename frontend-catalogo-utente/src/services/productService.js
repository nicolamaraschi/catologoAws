// frontend-catalogo-utente/src/services/productService.js
import api from './api';
import cacheService from './cacheService';

const CACHE_TTL = 10 * 60 * 1000; // 10 minuti

const productService = {
  // Get all products
  getAllProducts: async (lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `products_all_${lang}`;

      // Se non forziamo il refresh, proviamo a usare la cache
      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 ProductService: Using cached products');
          return cachedData;
        }
      }

      console.log('🔍 ProductService: Fetching all products from API...');
      const result = await api.get('/prodotti');
      console.log('✅ ProductService: Products fetched:', result?.length || 0, 'items');

      // Salva in cache
      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error('❌ ProductService: Error fetching all products:', error.message);
      throw error;
    }
  },

  // Get a single product by ID
  getProductById: async (productId, lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `product_${productId}_${lang}`;

      // Se non forziamo il refresh, proviamo a usare la cache
      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 ProductService: Using cached product');
          return cachedData;
        }
      }

      console.log(`🔍 ProductService: Fetching product with ID: ${productId} from API...`);
      const result = await api.get(`/prodotti/${productId}`);
      console.log('✅ ProductService: Product fetched:', result?.nome || 'Unknown');

      // Salva in cache
      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error(`❌ ProductService: Error fetching product with ID ${productId}:`, error.message);
      throw error;
    }
  },

  // Get products by category
  getProductsByCategory: async (category, lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `products_category_${category}_${lang}`;

      // Se non forziamo il refresh, proviamo a usare la cache
      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 ProductService: Using cached category products');
          return cachedData;
        }
      }

      console.log(`🔍 ProductService: Fetching products for category: ${category} from API...`);
      const encodedCategory = encodeURIComponent(category);
      const result = await api.get(`/categoria/${encodedCategory}`);
      console.log('✅ ProductService: Products by category fetched:', result?.length || 0, 'items');

      // Salva in cache
      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error(`❌ ProductService: Error fetching products for category ${category}:`, error.message);
      throw error;
    }
  },

  // Get products by subcategory
  getProductsBySubcategory: async (category, subcategory, lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `products_subcategory_${category}_${subcategory}_${lang}`;

      // Se non forziamo il refresh, proviamo a usare la cache
      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 ProductService: Using cached subcategory products');
          return cachedData;
        }
      }

      console.log(`🔍 ProductService: Fetching products for category: ${category}, subcategory: ${subcategory} from API...`);
      const encodedCategory = encodeURIComponent(category);
      const encodedSubcategory = encodeURIComponent(subcategory);
      const result = await api.get(`/categoria/${encodedCategory}/sottocategoria/${encodedSubcategory}`);
      console.log('✅ ProductService: Products by subcategory fetched:', result?.length || 0, 'items');

      // Salva in cache
      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error(`❌ ProductService: Error fetching products for subcategory ${subcategory}:`, error.message);
      throw error;
    }
  },

  // Forza il refresh della cache (utile per pulsanti "aggiorna")
  clearCache: () => {
    console.log('🗑️ ProductService: Clearing all product cache');
    cacheService.clearAll();
  },

  // Forza il refresh di tutti i prodotti
  refreshAllProducts: async (lang = 'it') => {
    return await productService.getAllProducts(lang, true);
  }
};

export default productService;