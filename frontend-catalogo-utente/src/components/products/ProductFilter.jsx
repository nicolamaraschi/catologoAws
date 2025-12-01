// frontend-catalogo-utente/src/components/products/ProductFilter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './ProductFilter.css';

const ProductFilter = React.memo(({ filters, onFilterChange, totalProducts }) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { t } = useLanguage();
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef(null);
  const previousFiltersRef = useRef(filters);
  const dropdownRef = useRef(null);

  const sortOptions = [
    { value: 'name-asc', label: t('name_asc') || 'Nome (A-Z)' },
    { value: 'name-desc', label: t('name_desc') || 'Nome (Z-A)' },
    { value: 'price-asc', label: t('price_asc') || 'Prezzo (Crescente)' },
    { value: 'price-desc', label: t('price_desc') || 'Prezzo (Decrescente)' }
  ];

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

  // Clean up del timer e click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gestione dell'ordinamento
  const handleSortSelect = (value) => {
    onFilterChange({ sort: value });
    setIsDropdownOpen(false);
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

        <div className="sort-box custom-dropdown" ref={dropdownRef}>
          <span className="sort-label">{t('sort_by') || 'Ordina per'}:</span>
          <button
            className="sort-toggle"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
          >
            {sortOptions.find(opt => opt.value === (filters.sort || 'name-asc'))?.label}
            <span className="dropdown-arrow">▼</span>
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  className={`dropdown-item ${filters.sort === option.value ? 'active' : ''}`}
                  onClick={() => handleSortSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
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