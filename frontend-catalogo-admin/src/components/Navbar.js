import React from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Navbar, Nav, NavDropdown, Button } from 'react-bootstrap';

// 1. Accetta 'user' e 'signOut' come props
const AppNavbar = ({ user, signOut }) => {
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
            {/* 2. FIX: Il controllo è stato esteso!
              Invece di controllare solo 'user', controlliamo 'user && user.attributes'.
              Questo previene l'errore se 'user' esiste ma 'attributes' non è ancora caricato.
            */}
            {user && user.attributes ? (
              <NavDropdown title={user.attributes.email} id="user-dropdown" align="end">
                <NavDropdown.Item disabled>
                  {/* Aggiunto optional chaining (?) per sicurezza */}
                  Ruolo: {user.signInUserSession?.accessToken?.payload["cognito:groups"]?.join(', ') || 'Admin'}
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item as={Button} onClick={signOut} className="text-danger">
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              // 3. Fallback per lo stato di caricamento
              <Nav.Link disabled>Caricamento utente...</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
};

export default AppNavbar;