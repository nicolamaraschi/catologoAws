import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getAllProdotti, getAllCategories, deleteProdotto } from '../api';
// import { getSubcategoriesByCategory } from '../api'; // Non usato nel filtro base

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  // const [subcategories, setSubcategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Stati per i filtri
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  // const [filterSubcategory, setFilterSubcategory] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Carica prodotti e categorie in parallelo
        const [productsData, categoriesData] = await Promise.all([
          getAllProdotti(),
          getAllCategories()
        ]);
        
        setProducts(productsData || []);
        setCategories(categoriesData || []);
        
        setLoading(false);
      } catch (err) {
        console.error("Errore nel caricamento dei dati:", err);
        setError("Impossibile caricare i dati. " + err.message);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Gestore per la cancellazione
  const handleDelete = async (productId, productName) => {
    if (window.confirm(`Sei sicuro di voler eliminare il prodotto: ${productName}?`)) {
      try {
        await deleteProdotto(productId);
        // Rimuovi il prodotto dallo stato per aggiornare la UI
        setProducts(products.filter(p => p.productId !== productId));
      } catch (err) {
        setError("Errore durante l'eliminazione: " + err.message);
      }
    }
  };

  // Logica di filtraggio
  const filteredProducts = products
    .filter(product => {
      const nomeIt = product.nome?.it || '';
      return nomeIt.toLowerCase().includes(filterText.toLowerCase());
    })
    .filter(product => {
      if (filterCategory === '') return true;
      const catIt = product.categoria?.it || '';
      return catIt === filterCategory;
    });

  return (
    <Container className="my-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h2 className="mb-0">Gestione Prodotti</h2>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {/* Filtri */}
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Filtra per nome</Form.Label>
                <Form.Control 
                  type="text"
                  placeholder="Cerca prodotto..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Filtra per Categoria</Form.Label>
                <Form.Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">Tutte le categorie</option>
                  {/* 1. FIX: Aggiunto 'index' al map e usato nella key */}
                  {categories.map((cat, index) => (
                    <option key={cat.categoryName || index} value={cat.translations?.it}>
                      {cat.translations?.it || cat.categoryName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Tabella Prodotti */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
              <p className="mt-2">Caricamento prodotti...</p>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Nome Prodotto</th>
                  <th>Codice</th>
                  <th>Categoria</th>
                  <th>Sottocategoria</th>
                  <th>Prezzo</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">Nessun prodotto trovato.</td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.productId}>
                      <td>{product.nome?.it || product.productId}</td>
                      <td>{product.codice}</td>
                      <td>{product.categoria?.it || 'N/D'}</td>
                      <td>{product.sottocategoria?.it || 'N/D'}</td>
                      <td>{product.prezzo ? `${product.prezzo.toFixed(2)} €` : 'N/D'}</td>
                      <td>
                        <Link to={`/edit-product/${product.productId}`} className="btn btn-primary btn-sm me-2">
                          Modifica
                        </Link>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleDelete(product.productId, product.nome?.it)}
                        >
                          Elimina
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ViewProducts;