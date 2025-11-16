// frontend-catalogo-utente/src/services/categoryService.js
import api from './api';

const categoryService = {
  // Get all categories
  getAllCategories: async (lang = 'it') => {
    try {
      console.log('🔍 CategoryService: Fetching all categories...');
      const result = await api.get('/categorie');
      console.log('✅ CategoryService: Categories fetched:', result?.length || 0, 'items');
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Error fetching categories:', error.message);
      throw error;
    }
  },

  // Get a single category by ID
  getCategoryById: async (categoryId, lang = 'it') => {
    try {
      console.log(`🔍 CategoryService: Fetching category with ID: ${categoryId}`);
      const encodedCategoryId = encodeURIComponent(categoryId);
      const result = await api.get(`/categorie/${encodedCategoryId}`);
      console.log('✅ CategoryService: Category fetched:', result);
      return result;
    } catch (error) {
      console.error(`❌ CategoryService: Error fetching category with ID ${categoryId}:`, error.message);
      throw error;
    }
  },
  
  // Get all subcategories in the catalog
  getAllSubcategories: async (lang = 'it') => {
    try {
      console.log('🔍 CategoryService: Fetching all subcategories...');
      const result = await api.get('/sottocategorie');
      console.log('✅ CategoryService: All subcategories fetched:', result?.length || 0, 'items');
      return result;
    } catch (error) {
      console.error('❌ CategoryService: Error fetching all subcategories:', error.message);
      throw error;
    }
  },
  
  // Get subcategories for a specific category
  getSubcategoriesByCategory: async (category, lang = 'it') => {
    try {
      console.log(`🔍 CategoryService: Fetching subcategories for category: ${category}`);
      const encodedCategory = encodeURIComponent(category);
      const result = await api.get(`/categoria/${encodedCategory}/sottocategorie`);
      console.log('✅ CategoryService: Subcategories for category fetched:', result?.length || 0, 'items');
      return result;
    } catch (error) {
      console.error(`❌ CategoryService: Error fetching subcategories for category ${category}:`, error.message);
      throw error;
    }
  },

  // Get category structure (categories + their subcategories)
  getCategoryStructure: async (lang = 'it') => {
    try {
      console.log('🔍 CategoryService: Fetching complete category structure...');
      
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
      return structure;
    } catch (error) {
      console.error('❌ CategoryService: Error fetching category structure:', error.message);
      throw error;
    }
  }
};

export default categoryService;