import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ContattiPage.css';

const ContattiPage = () => {
  const { t } = useLanguage();

  return (
    <div className="contatti-page">
      <div className="contatti-hero">
        <div className="container">
          <h1>{t('contacts_title')}</h1>
          <p>{t('contacts_intro')}</p>
        </div>
      </div>

      <div className="container contatti-content">
        <div className="contatti-grid">
          {/* Info Card */}
          <div className="contact-card info-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /></svg>
            </div>
            <h2>{t('direct_contacts_title')}</h2>
            <div className="contact-details">
              <div className="contact-item">
                <span className="label">{t('phone')}</span>
                <a href="tel:+390516671000" className="value">+39 051 6671000</a>
              </div>
              <div className="contact-item">
                <span className="label">{t('email')}</span>
                <a href="mailto:info@orsidetersivi.com" className="value">info@orsidetersivi.com</a>
              </div>
              <div className="contact-item">
                <span className="label">{t('pec')}</span>
                <a href="mailto:orsidetersivi@pec.it" className="value">orsidetersivi@pec.it</a>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="contact-card location-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            </div>
            <h2>{t('legal_headquarters_title')}</h2>
            <div className="contact-details">
              <p className="address">
                Via C. Bassi 22<br />
                40015 Galliera (BO)<br />
                Italia
              </p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Orsi+SRL+Galliera"
                target="_blank"
                rel="noopener noreferrer"
                className="map-link"
              >
                {t('view_on_map') || 'Vedi su Google Maps'} →
              </a>
            </div>
          </div>

          {/* Hours Card */}
          <div className="contact-card hours-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <h2>{t('office_hours_title')}</h2>
            <div className="hours-list">
              <div className="hour-row">
                <span className="day">{t('mon_fri')}</span>
                <span className="time">9:00 - 18:00</span>
              </div>
              <div className="hour-row closed">
                <span className="day">{t('saturday')}</span>
                <span className="time">{t('closed')}</span>
              </div>
              <div className="hour-row closed">
                <span className="day">{t('sunday')}</span>
                <span className="time">{t('closed')}</span>
              </div>
            </div>
          </div>

          {/* Company Info Card */}
          <div className="contact-card company-card">
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
            </div>
            <h2>{t('company_info_title')}</h2>
            <div className="company-details">
              <p><strong>{t('company')}:</strong> Orsi S.R.L.</p>
              <p><strong>{t('vat_number')}:</strong> IT 00829301209</p>
              <p><strong>{t('rea')}:</strong> BO 367676</p>
              <p><strong>{t('cf')}:</strong> 01995970363</p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="map-section">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2836.786353847384!2d11.39656831553554!3d44.75586697909944!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x477fd4a0a0a0a0a1%3A0x0!2sVia%20C.%20Bassi%2C%2022%2C%2040015%20Galliera%20BO!5e0!3m2!1sit!2sit!4v1625000000000!5m2!1sit!2sit"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            title="Orsi SRL Location"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default ContattiPage;
