import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, NavDropdown, Button } from 'react-bootstrap';

const AppNavbar = ({ user, signOut }) => {
  // Funzione helper per ottenere l'email dell'utente
  const getUserEmail = () => {
    if (user?.attributes?.email) {
      return user.attributes.email;
    }
    if (user?.username) {
      return user.username;
    }
    return null;
  };

  const userEmail = getUserEmail();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
      <div className="container-fluid">
        <LinkContainer to="/home">
          <Navbar.Brand>Catalogo Admin</Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/home">
              <Nav.Link>Home</Nav.Link>
            </LinkContainer>
            
            <NavDropdown title="Prodotti" id="prodotti-dropdown">
              <LinkContainer to="/view-products">
                <NavDropdown.Item>Visualizza Prodotti</NavDropdown.Item>
              </LinkContainer>
              <LinkContainer to="/add-product">
                <NavDropdown.Item>Aggiungi Prodotto</NavDropdown.Item>
              </LinkContainer>
            </NavDropdown>

            <LinkContainer to="/subcategories">
              <Nav.Link>Gestione Categorie</Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav>
            {/* FIX: Controllo più robusto per l'utente */}
            {userEmail ? (
              <NavDropdown title={userEmail} id="user-dropdown" align="end">
                <NavDropdown.Item disabled>
                  Ruolo: {user?.signInUserSession?.accessToken?.payload["cognito:groups"]?.join(', ') || 'Admin'}
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item 
                  onClick={() => {
                    console.log('🚪 Logout clicked');
                    signOut();
                  }}
                  className="text-danger"
                  style={{ cursor: 'pointer' }}
                >
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : user ? (
              // Se user esiste ma non ha email, mostra caricamento
              <Nav.Link disabled>Caricamento utente...</Nav.Link>
            ) : (
              // Se non c'è user, mostra che non è loggato
              <Nav.Link disabled>Non autenticato</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
};

export default AppNavbar;