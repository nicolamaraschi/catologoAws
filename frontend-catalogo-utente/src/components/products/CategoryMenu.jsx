// frontend-catalogo-utente/src/components/products/CategoryMenu.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';
import './CategoryMenu.css';

const CategoryMenu = ({ loading = false, activeCategory = null, activeSubcategory = null }) => {
  const { products, getLocalizedName } = useCatalog(); // 🔥 USA I DATI VERI DAL CONTEXT
  const [expandedCategories, setExpandedCategories] = useState({});
  const [categoriesWithSubs, setCategoriesWithSubs] = useState({});

  // 🔥 ESTRAE categorie e sottocategorie DAI PRODOTTI VERI (una volta sola o al cambio lingua)
  useEffect(() => {
    if (products.length === 0) return;

    const categoryMap = {};

    products.forEach(product => {
      const categoria = getLocalizedName(product.categoria);
      const sottocategoria = getLocalizedName(product.sottocategoria);

      if (categoria) {
        if (!categoryMap[categoria]) {
          categoryMap[categoria] = new Set();
        }
        if (sottocategoria) {
          categoryMap[categoria].add(sottocategoria);
        }
      }
    });

    // Converte Set in Array
    const finalMap = {};
    Object.keys(categoryMap).forEach(cat => {
      finalMap[cat] = Array.from(categoryMap[cat]);
    });

    setCategoriesWithSubs(finalMap);
    console.log('✅ CategoryMenu: Real categories extracted:', finalMap);
  }, [products, getLocalizedName]); // 🔥 DIPENDE da products e dalla lingua

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const encodeUrlParam = (param) => {
    return encodeURIComponent(param);
  };

  const categories = Object.keys(categoriesWithSubs);

  if (loading || categories.length === 0) {
    return (
      <div className="category-menu">
        <div className="category-menu-loading">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="category-menu">
      <h2 className="category-menu-title">Categorie</h2>

      <ul className="category-list">
        <li className={!activeCategory ? 'active' : ''}>
          <Link to="/catalogo">Tutti i Prodotti</Link>
        </li>

        {categories.map(category => {
          const isActive = category === activeCategory;
          const categorySubcategories = categoriesWithSubs[category] || [];
          const hasSubcategories = categorySubcategories.length > 0;
          const isExpanded = !!expandedCategories[category];

          return (
            <li key={category} className={isActive ? 'active' : ''}>
              <div className="category-item">
                <Link to={`/catalogo/categoria/${encodeUrlParam(category)}`}>
                  {category}
                </Link>

                {hasSubcategories && (
                  <button
                    className={`toggle-button ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleCategory(category)}
                    type="button"
                  >
                    <span className="toggle-icon"></span>
                  </button>
                )}
              </div>

              {hasSubcategories && (
                <ul className={`subcategory-list ${isExpanded ? 'expanded' : ''}`}>
                  {categorySubcategories.map(subcategory => (
                    <li key={subcategory} className={subcategory === activeSubcategory ? 'active' : ''}>
                      <Link to={`/catalogo/categoria/${encodeUrlParam(category)}/sottocategoria/${encodeUrlParam(subcategory)}`}>
                        {subcategory}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CategoryMenu;