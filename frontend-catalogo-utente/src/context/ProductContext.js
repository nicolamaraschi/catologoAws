import React, { createContext, useState, useContext } from 'react';
import productService from '../services/productService';

// Create context
const ProductContext = createContext();

// Create provider component
export const ProductProvider = ({ children }) => {
  const [currentProduct, setCurrentProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch a product by ID
  const fetchProduct = async (productId) => {
    try {
      setLoading(true);
      setError(null);

      const data = await productService.getProductById(productId);
      setCurrentProduct(data);

      // Optional: fetch related products (e.g., same category)
      if (data.categoria) {
        const allProducts = await productService.getAllProducts();
        const related = allProducts
          .filter(prod =>
            prod.productId !== data.productId &&
            prod.categoria === data.categoria
          )
          .slice(0, 4); // Limit to 4 related products

        setRelatedProducts(related);
      }

      setLoading(false);
      return data;
    } catch (err) {
      console.error(`Error fetching product with ID ${productId}:`, err);
      setError(err);
      setLoading(false);
      return null;
    }
  };

  // Clear the current product
  const clearProduct = () => {
    setCurrentProduct(null);
    setRelatedProducts([]);
  };

  // Context value
  const value = {
    currentProduct,
    relatedProducts,
    loading,
    error,
    fetchProduct,
    clearProduct
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

// Custom hook to use the product context
export const useProduct = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};

export default ProductContext;
