import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext'; // Importa useLanguage
import './Footer.css';

const Footer = () => {
  const { t } = useLanguage(); // Ottieni la funzione di traduzione
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section about">
            <h3>{t('eg_store')}</h3>
            <p>
              {t('footer_about_us')}
            </p>
            <div className="contact">
              <p><i className="icon-phone"></i> +39 051 6671000</p>
              <p><i className="icon-envelope"></i> info@orsidetersivi.com</p>
              <p><i className="icon-map-marker"></i> Via C. Bassi 22, 40015 Galliera (BO)</p>
            </div>
          </div>

          <div className="footer-section links">
            <h3>{t('useful_links')}</h3>
            <ul>
              <li><Link to="/">{t('home')}</Link></li>
              <li><Link to="/catalogo">{t('catalog_products')}</Link></li>
              <li><Link to="/contatti">{t('contacts')}</Link></li>
              <li><Link to="/privacy">{t('privacy_policy')}</Link></li>
            </ul>
          </div>

          <div className="footer-section help">
            <h3>{t('need_help') || 'Serve Aiuto?'}</h3>
            <p>{t('contact_us_email') || 'Scrivici per qualsiasi informazione:'}</p>
            <a href="mailto:info@orsidetersivi.com" className="help-email">
              info@orsidetersivi.com
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {currentYear} {t('eg_store')}. {t('all_rights_reserved')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
