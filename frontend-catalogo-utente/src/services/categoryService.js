// frontend-catalogo-utente/src/services/categoryService.js
import api from './api';
import cacheService from './cacheService';

const CACHE_TTL = 10 * 60 * 1000; // 10 minuti

const categoryService = {
  // Get all categories
  getAllCategories: async (lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `categories_all_${lang}`;

      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 CategoryService: Using cached categories');
          return cachedData;
        }
      }

      console.log('🔍 CategoryService: Fetching all categories from API...');
      const result = await api.get('/categorie');
      console.log('✅ CategoryService: Categories fetched:', result?.length || 0, 'items');

      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error('❌ CategoryService: Error fetching categories:', error.message);
      throw error;
    }
  },

  // Get a single category by ID
  getCategoryById: async (categoryId, lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `category_${categoryId}_${lang}`;

      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 CategoryService: Using cached category');
          return cachedData;
        }
      }

      console.log(`🔍 CategoryService: Fetching category with ID: ${categoryId} from API...`);
      const encodedCategoryId = encodeURIComponent(categoryId);
      const result = await api.get(`/categorie/${encodedCategoryId}`);
      console.log('✅ CategoryService: Category fetched:', result);

      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error(`❌ CategoryService: Error fetching category with ID ${categoryId}:`, error.message);
      throw error;
    }
  },

  // Get all subcategories in the catalog
  getAllSubcategories: async (lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `subcategories_all_${lang}`;

      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 CategoryService: Using cached subcategories');
          return cachedData;
        }
      }

      console.log('🔍 CategoryService: Fetching all subcategories from API...');
      const result = await api.get('/sottocategorie');
      console.log('✅ CategoryService: All subcategories fetched:', result?.length || 0, 'items');

      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error('❌ CategoryService: Error fetching all subcategories:', error.message);
      throw error;
    }
  },

  // Get subcategories for a specific category
  getSubcategoriesByCategory: async (category, lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `subcategories_category_${category}_${lang}`;

      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 CategoryService: Using cached category subcategories');
          return cachedData;
        }
      }

      console.log(`🔍 CategoryService: Fetching subcategories for category: ${category} from API...`);
      const encodedCategory = encodeURIComponent(category);
      const result = await api.get(`/categoria/${encodedCategory}/sottocategorie`);
      console.log('✅ CategoryService: Subcategories for category fetched:', result?.length || 0, 'items');

      cacheService.set(cacheKey, result, CACHE_TTL);

      return result;
    } catch (error) {
      console.error(`❌ CategoryService: Error fetching subcategories for category ${category}:`, error.message);
      throw error;
    }
  },

  // Get category structure (categories + their subcategories)
  getCategoryStructure: async (lang = 'it', forceRefresh = false) => {
    try {
      const cacheKey = `category_structure_${lang}`;

      if (!forceRefresh) {
        const cachedData = cacheService.get(cacheKey);
        if (cachedData) {
          console.log('📦 CategoryService: Using cached category structure');
          return cachedData;
        }
      }

      console.log('🔍 CategoryService: Fetching complete category structure from API...');

      const categories = await api.get('/categorie');
      const structure = {};

      for (const categoryObj of categories) {
        // Handle both string and object formats
        const categoryName = typeof categoryObj === 'string' ? categoryObj : (categoryObj.it || categoryObj.name || categoryObj);
        structure[categoryName] = [];

        try {
          const encodedCategory = encodeURIComponent(categoryName);
          const categorySubcategories = await api.get(`/categoria/${encodedCategory}/sottocategorie`);
          structure[categoryName] = categorySubcategories;
        } catch (err) {
          console.warn(`⚠️ CategoryService: No subcategories found for category: ${categoryName}`);
          structure[categoryName] = [];
        }
      }

      console.log('✅ CategoryService: Category structure built:', Object.keys(structure));

      cacheService.set(cacheKey, structure, CACHE_TTL);

      return structure;
    } catch (error) {
      console.error('❌ CategoryService: Error fetching category structure:', error.message);
      throw error;
    }
  },

  // Forza il refresh della cache
  clearCache: () => {
    console.log('🗑️ CategoryService: Clearing all category cache');
    cacheService.clearAll();
  }
};

export default categoryService;