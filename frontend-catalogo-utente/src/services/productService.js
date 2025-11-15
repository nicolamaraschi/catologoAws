// productService.js
import api from './api';

const productService = {
  // Get all products
  getAllProducts: async (lang = 'it') => {
    try {
      return await api.get(`/prodotti?lang=${lang}`);
    } catch (error) {
      console.error('Error fetching all products:', error);
      throw error;
    }
  },

  // Get a single product by ID
  getProductById: async (productId, lang = 'it') => {
    try {
      return await api.get(`/prodotti/${productId}?lang=${lang}`);
    } catch (error) {
      console.error(`Error fetching product with ID ${productId}:`, error);
      throw error;
    }
  },

  // Get products by category
  getProductsByCategory: async (category, lang = 'it') => {
    try {
      // CORREZIONE: Rimosso '/prodotti' finale
      // La rotta corretta è /categoria/{nome}, non /categoria/{nome}/prodotti
      return await api.get(`/categoria/${category}?lang=${lang}`);
    } catch (error) {
      console.error(`Error fetching products for category ${category}:`, error);
      throw error;
    }
  },

  // Get products by subcategory
  getProductsBySubcategory: async (category, subcategory, lang = 'it') => {
    try {
      // CORREZIONE: Rimosso '/prodotti' finale
      // La rotta corretta è /categoria/{nome}/sottocategoria/{subnome}
      return await api.get(`/categoria/${category}/sottocategoria/${subcategory}?lang=${lang}`);
    } catch (error) {
      console.error(`Error fetching products for subcategory ${subcategory}:`, error);
      throw error;
    }
  },
};

export default productService;