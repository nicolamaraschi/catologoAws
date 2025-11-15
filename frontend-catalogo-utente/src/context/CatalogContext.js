import React, { createContext, useState, useEffect, useContext } from 'react';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import { useLanguage } from './LanguageContext';

// Create context
const CatalogContext = createContext();

// Create provider component
export const CatalogProvider = ({ children }) => {
  const { language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: null,
    subcategory: null,
    sort: 'name-asc',
    priceRange: [0, 1000]
  });

  // Fetch all products and categories when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch products and categories in parallel
        // (La logica qui è corretta e usa i service giusti)
        const [productsData, categoriesData, subcategoriesData] = await Promise.all([
          productService.getAllProducts(language),
          categoryService.getAllCategories(language),
          categoryService.getAllSubcategories(language) // Ora questo endpoint esiste
        ]);
        
        setProducts(productsData);
        setCategories(categoriesData);
        setSubcategories(subcategoriesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching catalog data:', err);
        setError(err);
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [language]);

  // Fetch products by category or subcategory when filters change
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      if (!filters.category) return;
      
      try {
        setLoading(true);
        
        let data;
        if (filters.subcategory) {
          data = await productService.getProductsBySubcategory(
            filters.category, 
            filters.subcategory,
            language
          );
        } else {
          data = await productService.getProductsByCategory(filters.category, language);
        }
        
        setProducts(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching filtered products:', err);
        setError(err);
        setLoading(false);
      }
    };
    
    fetchFilteredProducts();
  }, [filters.category, filters.subcategory]);

  // Apply client-side filtering and sorting
  const filteredProducts = products
    .filter(product => {
      // Search filter
      if (filters.search && !product.nome?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      // Price range filter
      if (product.prezzo < filters.priceRange[0] || product.prezzo > filters.priceRange[1]) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort products
      switch (filters.sort) {
        case 'name-asc':
          return a.nome?.localeCompare(b.nome);
        case 'name-desc':
          return b.nome?.localeCompare(a.nome);
        case 'price-asc':
          return a.prezzo - b.prezzo;
        case 'price-desc':
          return b.prezzo - a.prezzo;
        default:
          return 0;
      }
    });

  // Update filters
  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Get a product by ID
  const getProductById = async (productId) => {
    try {
      setLoading(true);
      const data = await productService.getProductById(productId, language);
      setLoading(false);
      return data;
    } catch (err) {
      console.error(`Error fetching product with ID ${productId}:`, err);
      setError(err);
      setLoading(false);
      return null;
    }
  };

  // Get a category by ID
  const getCategoryById = async (categoryId) => {
    try {
      const data = await categoryService.getCategoryById(categoryId, language);
      return data;
    } catch (err) {
      console.error(`Error fetching category with ID ${categoryId}:`, err);
      return null;
    }
  };

  // Get subcategories for a category
  const getSubcategoriesByCategory = async (category) => {
    try {
      const data = await categoryService.getSubcategoriesByCategory(category, language);
      // Update subcategories state
      setSubcategories(prev => ({
        ...prev,
        [category]: data
      }));
      return data;
    } catch (err) {
      console.error(`Error fetching subcategories for category ${category}:`, err);
      return [];
    }
  };

  // ========================================================
  // FUNZIONE 'addSubcategory' RIMOSSA
  // Era una funzione admin rimasta per errore in questo file
  // ========================================================

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      category: null,
      subcategory: null,
      sort: 'name-asc',
      priceRange: [0, 1000]
    });
  };

  // Context value
  const value = {
    products: filteredProducts,
    categories,
    subcategories,
    loading,
    error,
    filters,
    updateFilters,
    getProductById,
    getCategoryById,
    getSubcategoriesByCategory,
    // --- 'addSubcategory' rimosso da qui ---
    clearFilters
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
};

// Custom hook to use the catalog context
export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};

export default CatalogContext;