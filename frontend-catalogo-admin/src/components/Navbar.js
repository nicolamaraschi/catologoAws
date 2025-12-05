import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiBox, FiGrid, FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';
import './Navbar.css';

const AppNavbar = ({ user, signOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const getUserEmail = () => {
    if (user?.attributes?.email) return user.attributes.email;
    if (user?.username) return user.username;
    return null;
  };

  const userEmail = getUserEmail();
  const userRole = user?.signInUserSession?.accessToken?.payload["cognito:groups"]?.join(', ') || 'Admin';

  return (
    <nav className={`custom-navbar ${scrolled ? 'scrolled' : ''}`}>
      <NavLink to="/home" className="brand-logo">
        <FiBox size={24} color="#3b82f6" />
        <span>Catalogo Admin</span>
      </NavLink>

      <button
        className="mobile-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX /> : <FiMenu />}
      </button>

      <ul className={`nav-menu ${isOpen ? 'open' : ''}`}>
        <li className="menu-item">
          <NavLink to="/home" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <FiHome size={18} />
            Home
          </NavLink>
        </li>

        <li className="menu-item">
          <div className="menu-link" style={{ cursor: 'pointer' }}>
            <FiBox size={18} />
            Prodotti
            <FiChevronDown size={14} style={{ marginLeft: 'auto' }} />
          </div>
          <div className="submenu-container">
            <NavLink to="/view-products" className="submenu-item">
              Visualizza Prodotti
            </NavLink>
            <div className="submenu-divider"></div>
            <NavLink to="/add-product" className="submenu-item">
              Aggiungi Prodotto
            </NavLink>
          </div>
        </li>

        <li className="menu-item">
          <NavLink to="/subcategories" className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}>
            <FiGrid size={18} />
            Gestione Categorie
          </NavLink>
        </li>

        {/* User Profile Section */}
        <li className="menu-item" style={{ marginLeft: 'auto' }}>
          {userEmail ? (
            <div className="menu-item">
              <div className="user-profile">
                <div className="user-avatar">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-email">{userEmail.split('@')[0]}</span>
                  <span className="user-role">{userRole}</span>
                </div>
                <FiChevronDown size={14} color="#a0a0a0" />
              </div>

              <div className="submenu-container">
                <div className="submenu-item" style={{ cursor: 'default', opacity: 0.7 }}>
                  <small>Signed in as</small><br />
                  <strong>{userEmail}</strong>
                </div>
                <div className="submenu-divider"></div>
                <div
                  className="submenu-item text-danger"
                  onClick={signOut}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}
                >
                  <FiLogOut size={16} />
                  Logout
                </div>
              </div>
            </div>
          ) : (
            <span className="menu-link disabled">Caricamento...</span>
          )}
        </li>
      </ul>
    </nav>
  );
};

export default AppNavbar;