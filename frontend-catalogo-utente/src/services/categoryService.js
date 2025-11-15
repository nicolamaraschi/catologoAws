// categoryService.js
import api from './api';

const categoryService = {
  // Get all categories
  getAllCategories: async (lang = 'it') => {
    try {
      console.log('Fetching categories from: /categorie');
      const result = await api.get(`/categorie?lang=${lang}`);
      console.log('Categories fetched:', result);
      return result;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get a single category by ID
  getCategoryById: async (categoryId, lang = 'it') => {
    try {
      console.log(`Fetching category with ID: ${categoryId}`);
      // Questo endpoint lo abbiamo aggiunto nel template.yaml
      const result = await api.get(`/categorie/${categoryId}?lang=${lang}`);
      console.log('Category fetched:', result);
      return result;
    } catch (error) {
      console.error(`Error fetching category with ID ${categoryId}:`, error);
      throw error;
    }
  },
  
  // Get all subcategories in the catalog
  getAllSubcategories: async (lang = 'it') => {
    try {
      console.log('Fetching all subcategories from: /sottocategorie');
      // Questo endpoint lo abbiamo aggiunto nel template.yaml
      const result = await api.get(`/sottocategorie?lang=${lang}`);
      console.log('Subcategories fetched:', result);
      return result;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },
  
  // Get subcategories for a specific category
  getSubcategoriesByCategory: async (category, lang = 'it') => {
    try {
      console.log(`Fetching subcategories for category: ${category}`);
      // Questo endpoint ora è gestito dalla nuova CategoriesTable
      return await api.get(`/categoria/${category}/sottocategorie?lang=${lang}`);
    } catch (error) {
      console.error(`Error fetching subcategories for category ${category}:`, error);
      throw error;
    }
  },
};

export default categoryService;