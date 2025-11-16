import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import productService from '../services/productService';
import { useLanguage } from '../context/LanguageContext';
import ProductDetail from '../components/products/ProductDetail';
import Loader from '../components/common/Loader';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage(); 
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 💡 FIX: Aggiungi un controllo per assicurarti che productId sia definito prima di chiamare l'API.
    if (!productId) {
      // Se l'ID non è presente, impostiamo immediatamente uno stato di non trovato o di errore.
      console.error("Error: productId is undefined. Cannot fetch product.");
      setError(new Error(t('product_not_found')));
      setLoading(false);
      return; // Interrompe l'esecuzione dell'useEffect
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        // La chiamata all'API avviene solo se productId è valido
        const data = await productService.getProductById(productId, language);
        setProduct(data);
        setLoading(false);
      } catch (err) {
        // Il tuo console.error originale è molto utile
        console.error(`Error fetching product with ID ${productId}:`, err);
        setError(err);
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [productId, language, t]); // Aggiunto 't' alle dipendenze per coerenza

  const handleGoBack = () => {
    navigate(-1); // Torna alla pagina precedente
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="error-message">
            <h2>{t('error_occurred')}</h2>
            <p>{error.message || t('error_loading_product_details')}</p>
            <button className="back-button" onClick={handleGoBack}>
              {t('go_back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="not-found-message">
            <h2>{t('product_not_found')}</h2>
            <p>{t('product_not_available_or_removed')}</p>
            <button className="back-button" onClick={handleGoBack}>
              {t('go_back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">{t('home')}</Link> / 
          <Link to="/catalogo">{t('catalog')}</Link> / 
          <span>{product.nome}</span>
        </div>
        
        <ProductDetail product={product} />
      </div>
    </div>
  );
};

export default ProductDetailPage;