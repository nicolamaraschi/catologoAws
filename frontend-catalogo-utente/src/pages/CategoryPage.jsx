import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductList from '../components/products/ProductList';
import CategoryMenu from '../components/products/CategoryMenu';
import ProductFilter from '../components/products/ProductFilter';
import { useLanguage } from '../context/LanguageContext';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import './CatalogPage.css'; // Corretto il nome del CSS

const CatalogPage = () => {
  const navigate = useNavigate();
  const { categoryId, subcategoryId } = useParams();
  const { language, t } = useLanguage();
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    sort: 'name-asc'
  });

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prevFilters => {
      const hasChanges = Object.keys(newFilters).some(
        key => prevFilters[key] !== newFilters[key]
      );

      if (!hasChanges) return prevFilters;

      return { ...prevFilters, ...newFilters };
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let productsData;

        if (subcategoryId && categoryId) {
          productsData = await productService.getProductsBySubcategory(categoryId, subcategoryId, language);
        } else if (categoryId) {
          productsData = await productService.getProductsByCategory(categoryId, language);
        } else {
          productsData = await productService.getAllProducts(language);
        }

        console.log('ProductsData received:', productsData);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subcategoryId, language]);

  const filteredProducts = useMemo(() => {
    console.log("Filtering products, total:", products?.length || 0, products);

    if (!Array.isArray(products) || products.length === 0) {
      console.log("No products to filter");
      return [];
    }

    const filtered = products
      .filter(product => {
        if (!product) {
          console.log("Skipping null/undefined product");
          return false;
        }

        if (filters.search && typeof filters.search === 'string' && filters.search.trim() !== '') {
          const searchTerm = filters.search.toLowerCase();
          const productName = (product.nome && typeof product.nome === 'string') ? product.nome.toLowerCase() : '';
          const productCode = (product.codice && typeof product.codice === 'string') ? product.codice.toLowerCase() : '';

          return productName.includes(searchTerm) || productCode.includes(searchTerm);
        }

        return true;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;

        switch (filters.sort) {
          case 'name-asc': {
            const nameA = (a.nome && typeof a.nome === 'string') ? a.nome : '';
            const nameB = (b.nome && typeof b.nome === 'string') ? b.nome : '';
            return nameA.localeCompare(nameB);
          }
          case 'name-desc': {
            const nameA = (a.nome && typeof a.nome === 'string') ? a.nome : '';
            const nameB = (b.nome && typeof b.nome === 'string') ? b.nome : '';
            return nameB.localeCompare(nameA);
          }
          case 'price-asc': {
            const priceA = (typeof a.prezzo === 'number') ? a.prezzo : 0;
            const priceB = (typeof b.prezzo === 'number') ? b.prezzo : 0;
            return priceA - priceB;
          }
          case 'price-desc': {
            const priceA = (typeof a.prezzo === 'number') ? a.prezzo : 0;
            const priceB = (typeof b.prezzo === 'number') ? b.prezzo : 0;
            return priceB - priceA;
          }
          default:
            return 0;
        }
      });

    console.log("Filtered products:", filtered.length, filtered);
    return filtered;
  }, [products, filters.search, filters.sort]);

  if (error && !loading) {
    return (
      <div className="catalog-page error-page">
        <div className="container">
          <h2>{t('error_occurred')}</h2>
          <p>{error.message || t('error_loading_data')}</p>
          <button
            onClick={() => navigate('/catalogo')}
            className="button button-primary"
          >
            {t('back_to_catalog')}
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="catalog-page">
      <div className="container">
        <div className="catalog-header">
          <h1>{t('catalog')}</h1>
          <p>Esplora tutti i nostri prodotti per l'igiene e la pulizia</p>
        </div>

        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <CategoryMenu
              loading={loading}
              activeCategory={categoryId}
              activeSubcategory={subcategoryId}
            />
          </aside>

          <div className="catalog-content">
            <ProductFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              totalProducts={filteredProducts.length}
            />

            <ProductList
              products={filteredProducts}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;