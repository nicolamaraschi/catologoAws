// frontend-catalogo-utente/src/components/products/ProductFilter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './ProductFilter.css';

const ProductFilter = React.memo(({ filters, onFilterChange, totalProducts }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const { t } = useLanguage();
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef(null);
  const previousFiltersRef = useRef(filters);
  
  // Sincronizza lo stato locale quando cambia il filtro esterno
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousFiltersRef.current = filters;
      return;
    }

    if (filters.search !== previousFiltersRef.current.search && 
        filters.search !== localSearch) {
      setLocalSearch(filters.search);
    }
    
    previousFiltersRef.current = filters;
  }, [filters, localSearch]);

  // Gestione dell'input di ricerca
  const handleSearchChange = (e) => {
    const newValue = e.target.value;
    setLocalSearch(newValue);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({ search: newValue });
    }, 300);
  };
  
  // Clean up del timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Gestione dell'ordinamento
  const handleSortChange = (e) => {
    onFilterChange({ sort: e.target.value });
  };
  
  // Pulizia della ricerca
  const clearSearch = () => {
    setLocalSearch('');
    onFilterChange({ search: '' });
  };
  
  return (
    <div className="product-filter">
      <div className="filter-options">
        <div className="search-box">
          <input
            type="text"
            placeholder={t('search_products') || 'Cerca prodotti...'}
            value={localSearch}
            onChange={handleSearchChange}
          />
          <button 
            className="clear-search"
            onClick={clearSearch}
            style={{ visibility: localSearch ? 'visible' : 'hidden' }}
            aria-label={t('clear_search') || 'Cancella ricerca'}
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className="sort-box">
          <label htmlFor="sort">{t('sort_by') || 'Ordina per'}:</label>
          <select
            id="sort"
            value={filters.sort || 'name-asc'}
            onChange={handleSortChange}
          >
            <option value="name-asc">{t('name_asc') || 'Nome (A-Z)'}</option>
            <option value="name-desc">{t('name_desc') || 'Nome (Z-A)'}</option>
            <option value="price-asc">{t('price_asc') || 'Prezzo (Crescente)'}</option>
            <option value="price-desc">{t('price_desc') || 'Prezzo (Decrescente)'}</option>
          </select>
        </div>
      </div>
      
      <div className="filter-summary">
        <span className="products-count">
          {totalProducts} {totalProducts === 1 ? t('product') || 'prodotto' : t('products') || 'prodotti'}
        </span>
      </div>
    </div>
  );
});

ProductFilter.displayName = 'ProductFilter';

export default ProductFilter;