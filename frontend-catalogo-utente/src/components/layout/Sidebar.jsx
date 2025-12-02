import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './Sidebar.css';
import categoryService from '../../services/categoryService';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t, language } = useLanguage();

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const structure = await categoryService.getCategoryStructure(language);
        setCategories(Object.keys(structure));
        setSubcategories(structure);
      } catch (err) {
        console.error('Error fetching categories for sidebar:', err);
      }
    };

    fetchCategories();
  }, [language]);

  // Determina la categoria attiva dall'URL
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const categoryIndex = pathParts.indexOf('categoria');

    if (categoryIndex !== -1 && pathParts[categoryIndex + 1]) {
      const categoryFromUrl = decodeURIComponent(pathParts[categoryIndex + 1]);
      setActiveCategory(categoryFromUrl);

      if (pathParts.length > categoryIndex + 3 && pathParts[categoryIndex + 2] === 'sottocategoria') {
        setActiveSubcategory(decodeURIComponent(pathParts[categoryIndex + 3]));
      } else {
        setActiveSubcategory(null);
      }

      setExpandedCategories(prev => ({
        ...prev,
        [categoryFromUrl]: true
      }));
    } else {
      setActiveCategory(null);
      setActiveSubcategory(null);
    }
  }, [location.pathname]);

  const toggleCategory = (category, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const encodeUrlParam = (param) => {
    return encodeURIComponent(param);
  };

  // Show categories only when in catalog
  const showCategories = location.pathname.startsWith('/catalogo');

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-overlay" onClick={onClose}></div>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h2>{t('menu')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li className={location.pathname === "/" ? "active" : ""}>
              <Link to="/" onClick={onClose}>{t('home')}</Link>
            </li>
            <li className={location.pathname.includes("/catalogo") && !location.pathname.includes("/categoria") ? "active" : ""}>
              <Link to="/catalogo" onClick={onClose}>{t('catalog')}</Link>
            </li>
          </ul>

          {showCategories && (
            <>
              <h3 className="sidebar-section-title">{t('categories')}</h3>
              <ul className="category-list">
                {categories.map(category => {
                  const isActive = category === activeCategory;
                  const categorySubcategories = subcategories[category] || [];
                  const hasSubcategories = categorySubcategories.length > 0;
                  const isExpanded = !!expandedCategories[category];

                  return (
                    <li key={category} className={isActive ? 'active' : ''}>
                      <div className="category-item">
                        <Link to={`/catalogo/categoria/${encodeUrlParam(category)}`} onClick={onClose}>
                          {category}
                        </Link>

                        {hasSubcategories && (
                          <button
                            className={`toggle-button ${isExpanded ? 'expanded' : ''}`}
                            onClick={(e) => toggleCategory(category, e)}
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
                              <Link
                                to={`/catalogo/categoria/${encodeUrlParam(category)}/sottocategoria/${encodeUrlParam(subcategory)}`}
                                onClick={onClose}
                              >
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
            </>
          )}

          <h3 className="sidebar-section-title">{t('pages')}</h3>
          <ul className="nav-list">
            <li className={location.pathname === "/contatti" ? "active" : ""}>
              <Link to="/contatti" onClick={onClose}>{t('contacts')}</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;