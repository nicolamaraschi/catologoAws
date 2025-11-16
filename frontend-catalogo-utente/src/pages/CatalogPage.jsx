// frontend-catalogo-utente/src/pages/CatalogPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext';
import { useLanguage } from '../context/LanguageContext';
import ProductList from '../components/products/ProductList';
import ProductFilter from '../components/products/ProductFilter';
import CategoryMenu from '../components/products/CategoryMenu';
import Loader from '../components/common/Loader';

const CatalogPage = () => {
  const { categoria, sottocategoria } = useParams();
  const { products, loading, error, getLocalizedName } = useCatalog();
  const { t } = useLanguage();

  // 🔥 STATO LOCALE per i filtri (non più nel Context)
  const [filters, setFilters] = useState({
    search: '',
    sort: 'name-asc'
  });

  // Filtri CLIENT-SIDE
  const filteredProducts = products
    .filter(product => {
      // Filtro per categoria dall'URL
      if (categoria) {
        const productCategory = getLocalizedName(product.categoria, '');
        if (productCategory !== decodeURIComponent(categoria)) {
          return false;
        }
      }

      // Filtro per sottocategoria dall'URL
      if (sottocategoria) {
        const productSubcategory = getLocalizedName(product.sottocategoria, '');
        if (productSubcategory !== decodeURIComponent(sottocategoria)) {
          return false;
        }
      }

      // Filtro ricerca
      if (filters.search) {
        const productName = getLocalizedName(product.nome, '');
        const productCode = product.codice || '';
        const searchTerm = filters.search.toLowerCase();
        return (
          productName.toLowerCase().includes(searchTerm) ||
          productCode.toLowerCase().includes(searchTerm)
        );
      }

      return true;
    })
    .sort((a, b) => {
      const nameA = getLocalizedName(a.nome, '');
      const nameB = getLocalizedName(b.nome, '');
      
      switch (filters.sort) {
        case 'name-asc':
          return nameA.localeCompare(nameB);
        case 'name-desc':
          return nameB.localeCompare(nameA);
        case 'price-asc':
          return (a.prezzo || 0) - (b.prezzo || 0);
        case 'price-desc':
          return (b.prezzo || 0) - (a.prezzo || 0);
        default:
          return 0;
      }
    });

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Build page title
  const getPageTitle = () => {
    if (categoria && sottocategoria) {
      return `${decodeURIComponent(categoria)} - ${decodeURIComponent(sottocategoria)}`;
    } else if (categoria) {
      return decodeURIComponent(categoria);
    }
    return t('catalog');
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="error-message">
        <p>{t('error_loading_products')}</p>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="catalog-page">
        <div className="catalog-header">
          <h1>{getPageTitle()}</h1>
          {categoria && (
            <p className="catalog-breadcrumb">
              {t('catalog')} &gt; {decodeURIComponent(categoria)}
              {sottocategoria && ` > ${decodeURIComponent(sottocategoria)}`}
            </p>
          )}
        </div>

        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <CategoryMenu 
              activeCategory={categoria ? decodeURIComponent(categoria) : null}
              activeSubcategory={sottocategoria ? decodeURIComponent(sottocategoria) : null}
            />
          </aside>

          <main className="catalog-content">
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
          </main>
        </div>
      </div>
    </div>
  );
};

export default CatalogPage;