import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser, FaLock, FaSignInAlt, FaExclamationCircle, FaInfoCircle, FaSpinner } from 'react-icons/fa';
import './Login.css';
// 1. IMPORTA la funzione di login dal file API centralizzato
import { login } from '../api'; 

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionExpired = searchParams.get('sessionExpired');
    
    if (sessionExpired === 'true') {
      setError('La tua sessione è scaduta. Effettua nuovamente il login.');
    }
    
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/home');
    }
    
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, [location, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Inserisci username e password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 2. USA la funzione di login centralizzata (niente più fetch!)
      const data = await login(username, password);
      
      if (data && data.token) {
        // Gestione "ricordami"
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }
        
        // 3. SALVA il token e naviga
        localStorage.setItem('authToken', data.token);
        navigate('/home');
      } else {
        setError(data.message || 'Nome utente o password non validi');
      }
    } catch (err) {
      console.error('Login error:', err);
      // L'interceptor di Axios gestisce i 401, ma qui gestiamo altri errori
      const errorMsg = err.response?.data?.message || 'Errore durante il login. Riprova più tardi.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  // Il resto del JSX (return) rimane IDENTICO
  // ... (copia e incolla tutto il tuo return da <div className="catalog-login-page"> in poi)
  
  return (
    <div className="catalog-login-page">
      <div className="login-content-wrapper">
        <div className="login-brand-section">
          <h1 className="login-brand-title">Catalogo <span>Prodotti</span></h1>
          <p className="login-brand-tagline">Sistema di gestione catalogo e schede prodotti</p>
        </div>
        
        <div className="login-form-container">
          <div className="login-header">
            <div className="login-icon-wrapper">
              <FaUser className="login-icon" />
            </div>
            <h2>Accesso Admin</h2>
            <p>Accedi per gestire i prodotti del catalogo</p>
          </div>
          
          {error && (
            <div className="login-alert error">
              <FaExclamationCircle />
              <span>{error}</span>
            </div>
          )}
          
          {location.search.includes('sessionExpired') && (
            <div className="login-alert info">
              <FaInfoCircle />
              <span>Sessione scaduta per inattività. Effettua nuovamente il login.</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">
                <FaUser className="input-icon" />
                <span>Username</span>
              </label>
              <input
                type="text"
                id="username"
                placeholder="Inserisci il tuo username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">
                <FaLock className="input-icon" />
                <span>Password</span>
              </label>
              <div className="password-field">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  id="password"
                  placeholder="Inserisci la tua password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {isPasswordVisible ? "Nascondi" : "Mostra"}
                </button>
              </div>
            </div>
            
            <div className="form-options">
              <div className="remember-option">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <label htmlFor="remember-me">Ricordami</label>
              </div>
              
              <a href="#/" className="forgot-password">Password dimenticata?</a>
            </div>
            
            <button 
              type="submit" 
              className="login-submit-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner-icon" />
                  <span>Autenticazione...</span>
                </>
              ) : (
                <>
                  <FaSignInAlt />
                  <span>Accedi</span>
                </>
              )}
            </button>
          </form>
          
          <div className="login-footer">
            <p>&copy; {new Date().getFullYear()} EG Store. Tutti i diritti riservati.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;