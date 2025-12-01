// frontend-catalogo-utente/src/context/CatalogContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import productService from '../services/productService';
import { useLanguage } from './LanguageContext';

const CatalogContext = createContext();

export const CatalogProvider = ({ children }) => {
  const { language } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Helper per localizzazione
  const getLocalizedName = useCallback((nameObj, fallback = '') => {
    if (typeof nameObj === 'string') return nameObj;
    if (typeof nameObj === 'object' && nameObj) {
      return nameObj[language] || nameObj.it || nameObj.en || Object.values(nameObj)[0] || fallback;
    }
    return fallback;
  }, [language]);

  // 🔥 UNA SOLA CHIAMATA API
  useEffect(() => {
    if (dataLoaded) return; // Non ricaricare se già caricato

    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('🔍 CatalogContext: Loading products (ONCE)...');

        const productsData = await productService.getAllProducts();
        setProducts(productsData || []);
        setDataLoaded(true);
        setLoading(false);

        console.log('✅ CatalogContext: Products loaded:', productsData?.length || 0);
      } catch (err) {
        console.error('❌ CatalogContext: Error:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchProducts();
  }, [dataLoaded]);

  const value = {
    products,
    loading,
    error,
    getLocalizedName
  };

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};

export default CatalogContext;