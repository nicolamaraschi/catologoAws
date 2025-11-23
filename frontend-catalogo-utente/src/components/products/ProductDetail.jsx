import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext'; // Import useLanguage
import './ProductDetail.css';

const ProductDetail = ({ product }) => {
  const [activeImage, setActiveImage] = useState(0);
  const { t, language } = useLanguage(); // Use the translation hook

  if (!product) {
    return <div className="product-detail-loading">{t('loading')}</div>;
  }

  // 🔥 HELPER: Estrae il testo localizzato
  const getLocalizedText = (textObj, fallback = '') => {
    if (typeof textObj === 'string') return textObj;
    if (typeof textObj === 'object' && textObj) {
      return textObj[language] || textObj.it || textObj.en || Object.values(textObj)[0] || fallback;
    }
    return fallback;
  };

  const {
    nome,
    tipo,
    prezzo,
    unita,
    categoria,
    sottocategoria,
    descrizione,
    immagini,
    codice,
    tipoImballaggio,
    pezziPerCartone,
    cartoniPerEpal,
    pezziPerEpal
  } = product;

  // 🔥 CORREZIONE: Estrai i nomi localizzati
  const productName = getLocalizedText(nome, t('product_without_name'));
  const productCategory = getLocalizedText(categoria, t('category_not_specified'));
  const productSubcategory = getLocalizedText(sottocategoria, '');
  const productType = getLocalizedText(tipo, t('type_not_specified'));
  const productDescription = getLocalizedText(descrizione, t('no_description_available'));

  return (
    <div className="product-detail">
      <div className="product-images">
        <div className="main-image">
          {immagini && immagini.length > 0 ? (
            <img
              src={immagini[activeImage]}
              alt={productName}
              className="animate-fade-in"
            />
          ) : (
            <div className="image-placeholder">
              <span>{t('image_not_available')}</span>
            </div>
          )}
        </div>

        {immagini && immagini.length > 1 && (
          <div className="thumbnail-gallery">
            {immagini.map((img, index) => (
              <div
                key={index}
                className={`thumbnail ${index === activeImage ? 'active' : ''}`}
                onClick={() => setActiveImage(index)}
              >
                <img src={img} alt={`${productName} - ${t('image')} ${index + 1}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <div className="product-category">
          <Link to={`/catalogo/categoria/${categoria}`}>{productCategory}</Link>
        </div>

        {sottocategoria && (
          <div className="product-subcategory">
            <Link to={`/catalogo/categoria/${categoria}/sottocategoria/${sottocategoria}`}>
              {productSubcategory}
            </Link>
          </div>
        )}

        <h1 className="product-title">{productName}</h1>
        {codice && <div className="product-code">{t('code')}: {codice}</div>}
        <div className="product-type">{productType}</div>

        <div className="product-price">
          <span className="price">{typeof prezzo === 'number' ? prezzo.toFixed(2) : '0.00'} €</span>
          <span className="unit">{unita}</span>
        </div>

        {tipoImballaggio && (
          <div className="product-packaging">
            <h3>{t('packaging_information')}</h3>
            <table className="packaging-table">
              <tbody>
                <tr>
                  <td>{t('packaging_type')}:</td>
                  <td><strong>{tipoImballaggio}</strong></td>
                </tr>
                {pezziPerCartone && (
                  <tr>
                    <td>{t('pieces_per_carton')}:</td>
                    <td><strong>{pezziPerCartone}</strong></td>
                  </tr>
                )}
                {cartoniPerEpal && (
                  <tr>
                    <td>{t('cartons_per_epal')}:</td>
                    <td><strong>{cartoniPerEpal}</strong></td>
                  </tr>
                )}
                {pezziPerEpal && (
                  <tr>
                    <td>{t('total_pieces_per_epal')}:</td>
                    <td><strong>{pezziPerEpal}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="product-description">
          <h3>{t('description')}</h3>
          <p>{productDescription}</p>
        </div>

        <div className="product-actions">
          <button className="contact-button">
            {t('request_information')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;