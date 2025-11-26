import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/products/ProductCard';
import { FaHome, FaIndustry } from 'react-icons/fa';
import { MdVerified, MdLocalShipping, MdSupportAgent, MdEco } from 'react-icons/md';
import { useLanguage } from '../context/LanguageContext';
import productService from '../services/productService';
import categoryService from '../services/categoryService';
import './HomePage.css';

const HomePage = () => {
  const { t, language } = useLanguage();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories] = useState([
    { id: 'Domestico', name: t('domestic'), icon: <FaHome size={32} /> },
    { id: 'Industriale', name: t('industrial'), icon: <FaIndustry size={32} /> }
  ]);
  const [subcategories, setSubcategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all products using the service
        const allProducts = await productService.getAllProducts(language);

        // Take 4 random products or fewer if there are less than 4
        const randomProducts = Array.isArray(allProducts) ?
          allProducts
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.min(4, allProducts.length)) :
          [];

        setFeaturedProducts(randomProducts);

        // Fetch subcategories using the service
        const subcategoriesData = await categoryService.getAllSubcategories(language);
        setSubcategories(subcategoriesData || {});

        setLoading(false);
      } catch (err) {
        console.error('Error fetching homepage data:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [language]); // Aggiungi language come dependency

  // Funzione per codificare in modo sicuro i parametri nell'URL
  const encodeUrlParam = (param) => {
    return encodeURIComponent(param);
  };

  return (
    <div className="home-page">
      {/* Hero section */}
      {/* Hero section */}
      <section className="hero-section">
        <video className="hero-bg-video" autoPlay loop muted playsInline>
          <source src="/video.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>

        <div className="container">
          <div className="hero-container">
            <div className="hero-content centered">
              <h1 className="animate-slide-from-left">{t('homepage_title')}</h1>
              <p className="animate-slide-from-left delay-100">
                {t('homepage_subtitle')}
              </p>
              <Link to="/catalogo" className="cta-button animate-slide-from-left delay-200">
                {t('explore_catalog')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Company Profile Video Section */}
      <section className="company-video-section">
        <div className="container">
          <div className="company-video-wrapper">
            <video
              className="company-video"
              controls
              loop
              playsInline
              poster="/logo.png"
            >
              <source src="/companyProfileOrsiItaliano.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* Featured products section */}
      <section className="featured-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('featured_products')}</h2>
            <Link to="/catalogo" className="view-all">{t('view_all')}</Link>
          </div>

          {loading ? (
            <div className="loading-container">
              <p>{t('loading_products')}</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{t('error_loading_products_message')}</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="no-products">
              <p>{t('no_products_available')}</p>
            </div>
          ) : (
            <div className="featured-products">
              {featuredProducts.map((product) => (
                <div key={product.productId || product.id} className="featured-product-item">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories section */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('explore_by_category')}</h2>
          </div>

          <div className="categories-grid">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/catalogo/categoria/${encodeUrlParam(category.id)}`}
                className="category-card"
              >
                <div className="category-icon">
                  {category.icon}
                </div>
                <h3>{category.name}</h3>
                <span className="category-count">
                  {subcategories[category.id]?.length || 0} {t('subcategories_count')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <MdVerified size={40} color="#3f51b5" />
              </div>
              <h3>{t('guaranteed_quality')}</h3>
              <p>{t('guaranteed_quality_description')}</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <MdLocalShipping size={40} color="#3f51b5" />
              </div>
              <h3>{t('fast_delivery')}</h3>
              <p>{t('fast_delivery_description')}</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <MdSupportAgent size={40} color="#3f51b5" />
              </div>
              <h3>{t('technical_support')}</h3>
              <p>{t('technical_support_description')}</p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">
                <MdEco size={40} color="#3f51b5" />
              </div>
              <h3>{t('eco_friendly')}</h3>
              <p>{t('eco_friendly_description')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;