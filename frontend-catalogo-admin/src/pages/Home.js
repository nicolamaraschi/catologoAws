// src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { FiPlus, FiList, FiEdit, FiGrid, FiArrowRight } from 'react-icons/fi';
import './Dashboard.css';

const Home = () => {
  const cards = [
    {
      title: 'Aggiungi Prodotto',
      description: 'Inserisci un nuovo prodotto nel catalogo con tutti i dettagli, immagini e specifiche tecniche.',
      icon: <FiPlus />,
      colorClass: 'icon-blue',
      link: '/add-product',
      btnText: 'Nuovo Prodotto'
    },
    {
      title: 'Visualizza Prodotti',
      description: 'Consulta l\'intero catalogo prodotti con filtri avanzati per categoria e stato.',
      icon: <FiList />,
      colorClass: 'icon-green',
      link: '/view-products',
      btnText: 'Vedi Catalogo'
    },
    {
      title: 'Gestione Categorie',
      description: 'Organizza la struttura del catalogo modificando categorie e sottocategorie.',
      icon: <FiGrid />,
      colorClass: 'icon-purple',
      link: '/subcategories',
      btnText: 'Gestisci Categorie'
    },
    {
      title: 'Modifica Rapida',
      description: 'Accedi rapidamente alla modifica dei prodotti esistenti per aggiornamenti veloci.',
      icon: <FiEdit />,
      colorClass: 'icon-orange',
      link: '/view-products', // Redirecting to view products as edit is usually done from there or we can keep edit-product if it's a specific search page
      btnText: 'Modifica'
    }
  ];

  return (
    <div className="dashboard-container">
      <Container>
        <div className="page-header">
          <h1 className="page-title">Gestione Catalogo</h1>
          <p className="page-subtitle">
            Pannello di controllo unificato per la gestione dei prodotti e della struttura del catalogo.
          </p>
        </div>

        <Row className="g-4">
          {cards.map((card, index) => (
            <Col md={6} lg={3} key={index}>
              <div className="glass-card">
                <div className={`card-icon-wrapper ${card.colorClass}`}>
                  {card.icon}
                </div>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-description">{card.description}</p>
                <div className="card-action">
                  <Link to={card.link} className="btn-custom btn-outline-custom w-100 justify-content-center">
                    {card.btnText} <FiArrowRight />
                  </Link>
                </div>
              </div>
            </Col>
          ))}
        </Row>

        <div className="mt-5">
          <div className="glass-card p-4">
            <Row className="align-items-center">
              <Col md={8}>
                <h3 className="card-title mb-2">Struttura del Catalogo</h3>
                <p className="text-secondary mb-0">
                  Il catalogo è diviso in due macro-aree principali: <strong>Domestico</strong> e <strong>Industriale</strong>.
                  Gestisci le sottocategorie per mantenere il catalogo organizzato.
                </p>
              </Col>
              <Col md={4} className="text-md-end mt-3 mt-md-0">
                <Link to="/subcategories" className="btn-custom btn-primary-custom">
                  Gestisci Struttura <FiGrid />
                </Link>
              </Col>
            </Row>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Home;