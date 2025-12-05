import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiBox, FiGrid, FiUser, FiLogOut, FiChevronDown } from 'react-icons/fi';
import './Navbar.css';

const AppNavbar = ({ user, signOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(null);
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
    setMobileSubmenuOpen(null);
  }, [location]);

  const toggleMobileSubmenu = (menuName) => {
    if (window.innerWidth <= 992) {
      setMobileSubmenuOpen(mobileSubmenuOpen === menuName ? null : menuName);
    }
  };

  const getUserEmail = () => {
    // Try to get email from various possible locations in the Cognito user object
    if (user?.signInUserSession?.idToken?.payload?.email) {
      return user.signInUserSession.idToken.payload.email;
    }
    if (user?.attributes?.email) {
      return user.attributes.email;
    }
    // If username looks like an email, use it
    if (user?.username && user.username.includes('@')) {
      return user.username;
    }
    // Fallback if no email found - do NOT return UUID/username if it's not an email
    return 'Admin';
  };

  const userEmail = getUserEmail();
  const userRole = user?.signInUserSession?.accessToken?.payload?.["cognito:groups"]?.join(', ') || 'Admin';

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

        <li className={`menu-item ${mobileSubmenuOpen === 'products' ? 'active' : ''}`}>
          <div
            className="menu-link"
            style={{ cursor: 'pointer' }}
            onClick={() => toggleMobileSubmenu('products')}
          >
            <FiBox size={18} />
            Prodotti
            <FiChevronDown
              size={14}
              style={{
                marginLeft: 'auto',
                transform: mobileSubmenuOpen === 'products' ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            />
          </div>
          <div className={`submenu-container ${mobileSubmenuOpen === 'products' ? 'mobile-open' : ''}`}>
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
              <div
                className="user-profile"
                onClick={() => toggleMobileSubmenu('profile')}
              >
                <div className="user-avatar">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-email">{userEmail.split('@')[0]}</span>
                  <span className="user-role">{userRole}</span>
                </div>
                <FiChevronDown
                  size={14}
                  color="#a0a0a0"
                  style={{
                    transform: mobileSubmenuOpen === 'profile' ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                />
              </div>

              <div className={`submenu-container ${mobileSubmenuOpen === 'profile' ? 'mobile-open' : ''}`}>
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