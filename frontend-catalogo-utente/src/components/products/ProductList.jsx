import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import Loader from '../common/Loader';
import { useLanguage } from '../../context/LanguageContext'; // Importa useLanguage
import './ProductList.css';

const ProductList = ({ products, loading, error }) => {
  const { t } = useLanguage(); // Ottieni la funzione di traduzione
  const [visibleProducts, setVisibleProducts] = useState([]);

  useEffect(() => {
    console.log("ProductList received products:", products);

    if (products && products.length > 0) {
      // Simulate progressive loading for smooth animation
      const timer = setTimeout(() => {
        setVisibleProducts(products);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setVisibleProducts([]);
    }
  }, [products]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    console.error("ProductList error:", error);
    return (
      <div className="error-message">
        <p>{t('error_loading_products')}</p>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!products || products.length === 0) {
    console.log("No products to display");
    return (
      <div className="no-products">
        <p>{t('no_products_found')}</p>
      </div>
    );
  }

  console.log("Rendering ProductList with", visibleProducts.length, "products");

  return (
    <div className="product-list">
      {visibleProducts.map((product, index) => {
        console.log("Rendering product:", product.productId, product.nome);
        return (
          <div
            key={product.productId}
            className="product-item animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ProductCard product={product} />
          </div>
        );
      })}
    </div>
  );
};

export default ProductList;