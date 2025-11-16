// frontend-catalogo-utente/src/services/productService.js
import api from './api';

const productService = {
  // Get all products
  getAllProducts: async (lang = 'it') => {
    try {
      console.log('🔍 ProductService: Fetching all products...');
      const result = await api.get('/prodotti');
      console.log('✅ ProductService: Products fetched:', result?.length || 0, 'items');
      return result;
    } catch (error) {
      console.error('❌ ProductService: Error fetching all products:', error.message);
      throw error;
    }
  },

  // Get a single product by ID
  getProductById: async (productId, lang = 'it') => {
    try {
      console.log(`🔍 ProductService: Fetching product with ID: ${productId}`);
      const result = await api.get(`/prodotti/${productId}`);
      console.log('✅ ProductService: Product fetched:', result?.nome || 'Unknown');
      return result;
    } catch (error) {
      console.error(`❌ ProductService: Error fetching product with ID ${productId}:`, error.message);
      throw error;
    }
  },

  // Get products by category
  getProductsByCategory: async (category, lang = 'it') => {
    try {
      console.log(`🔍 ProductService: Fetching products for category: ${category}`);
      const encodedCategory = encodeURIComponent(category);
      const result = await api.get(`/categoria/${encodedCategory}`);
      console.log('✅ ProductService: Products by category fetched:', result?.length || 0, 'items');
      return result;
    } catch (error) {
      console.error(`❌ ProductService: Error fetching products for category ${category}:`, error.message);
      throw error;
    }
  },

  // Get products by subcategory
  getProductsBySubcategory: async (category, subcategory, lang = 'it') => {
    try {
      console.log(`🔍 ProductService: Fetching products for category: ${category}, subcategory: ${subcategory}`);
      const encodedCategory = encodeURIComponent(category);
      const encodedSubcategory = encodeURIComponent(subcategory);
      const result = await api.get(`/categoria/${encodedCategory}/sottocategoria/${encodedSubcategory}`);
      console.log('✅ ProductService: Products by subcategory fetched:', result?.length || 0, 'items');
      return result;
    } catch (error) {
      console.error(`❌ ProductService: Error fetching products for subcategory ${subcategory}:`, error.message);
      throw error;
    }
  }
};

export default productService;