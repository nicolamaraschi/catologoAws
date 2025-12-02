import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { t } = useLanguage();

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
            <li className={location.pathname.includes("/catalogo") ? "active" : ""}>
              <Link to="/catalogo" onClick={onClose}>{t('catalog')}</Link>
            </li>
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