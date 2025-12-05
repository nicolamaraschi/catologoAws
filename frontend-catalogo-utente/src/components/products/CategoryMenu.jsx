// frontend-catalogo-utente/src/components/products/CategoryMenu.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';
import { useLanguage } from '../../context/LanguageContext';
import { normalizeCategory } from '../../utils/categoryUtils';
import './CategoryMenu.css';

const CategoryMenu = ({ loading = false, activeCategory = null, activeSubcategory = null }) => {
  const { products, getLocalizedName } = useCatalog(); // 🔥 USA I DATI VERI DAL CONTEXT
  const { t } = useLanguage();
  const [categoriesWithSubs, setCategoriesWithSubs] = useState({});

  // 🔥 ESTRAE categorie e sottocategorie DAI PRODOTTI VERI (una volta sola o al cambio lingua)
  useEffect(() => {
    if (products.length === 0) return;

    const categoryMap = {};

    products.forEach(product => {
      const rawCategory = getLocalizedName(product.categoria);
      const categoria = normalizeCategory(rawCategory);
      const sottocategoria = getLocalizedName(product.sottocategoria);

      // Debug log for German language issues
      if (rawCategory && !categoria) {
        console.warn('⚠️ CategoryMenu: Unmatched category:', rawCategory, 'Normalized:', categoria);
      }

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

          return (
            <li key={category} className={isActive ? 'active' : ''}>
              <div className="category-item">
                <Link to={`/catalogo/categoria/${encodeUrlParam(category)}`}>
                  {category === 'Domestico' ? t('domestic') : (category === 'Professione' ? t('profession') : category)}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {/* SUBCATEGORIE MOSTRATE SOLO SE LA CATEGORIA E' ATTIVA */}
      {activeCategory && categoriesWithSubs[activeCategory]?.length > 0 && (
        <div className="subcategory-row">
          <ul className="subcategory-pills">
            {categoriesWithSubs[activeCategory].map(subcategory => (
              <li key={subcategory} className={subcategory === activeSubcategory ? 'active' : ''}>
                <Link to={`/catalogo/categoria/${encodeUrlParam(activeCategory)}/sottocategoria/${encodeUrlParam(subcategory)}`}>
                  {subcategory}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CategoryMenu;