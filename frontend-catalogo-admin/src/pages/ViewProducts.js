import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Alert, Spinner, Badge, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getAllProdotti, getAllCategories, deleteProdotto } from '../api';

const ViewProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stati per i filtri
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Stati per il modale di conferma eliminazione
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('🔍 Loading products and categories...');

        // Carica prodotti e categorie in parallelo
        const [productsData, categoriesData] = await Promise.all([
          getAllProdotti(),
          getAllCategories()
        ]);

        console.log('📦 Products loaded:', productsData);
        console.log('📋 Categories loaded:', categoriesData);

        setProducts(productsData || []);
        setCategories(categoriesData || []);

        setLoading(false);
      } catch (err) {
        console.error("❌ Error loading data:", err);
        setError("Impossibile caricare i dati. " + err.message);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Apre il modale di conferma
  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Esegue la cancellazione
  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      setIsDeleting(true);
      await deleteProdotto(productToDelete.productId);
      // Rimuovi il prodotto dallo stato per aggiornare la UI
      setProducts(products.filter(p => p.productId !== productToDelete.productId));
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (err) {
      setError("Errore durante l'eliminazione: " + err.message);
      setShowDeleteModal(false); // Chiudi comunque il modale in caso di errore
    } finally {
      setIsDeleting(false);
    }
  };

  // Logica di filtraggio aggiornata per il nuovo formato
  const filteredProducts = products
    .filter(product => {
      // Filtra per nome (controlla sia nome.it che productId come fallback)
      const nomeIt = product.nome?.it || product.productId || '';
      return nomeIt.toLowerCase().includes(filterText.toLowerCase());
    })
    .filter(product => {
      if (filterCategory === '') return true;
      // Filtra per categoria usando il nuovo formato
      const catIt = product.categoria?.it || '';
      return catIt === filterCategory;
    });

  // Funzione per ottenere l'URL dell'immagine del prodotto
  const getProductImageUrl = (product) => {
    // Controlla se il prodotto ha immagini
    if (product.immagini && product.immagini.length > 0) {
      // Restituisce la prima immagine
      return product.immagini[0];
    }
    // Immagine placeholder se non ci sono immagini
    return '/placeholder-image.png';
  };

  // Componente per visualizzare le immagini del prodotto
  const ProductImages = ({ product }) => {
    if (!product.immagini || product.immagini.length === 0) {
      return <Badge bg="secondary">Nessuna immagine</Badge>;
    }

    return (
      <div className="d-flex flex-wrap gap-1">
        {product.immagini.slice(0, 3).map((imageUrl, index) => (
          <img
            key={index}
            src={imageUrl}
            alt={`${product.nome?.it} - ${index + 1}`}
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'cover',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ))}
        {product.immagini.length > 3 && (
          <Badge bg="info">+{product.immagini.length - 3}</Badge>
        )}
      </div>
    );
  };

  return (
    <Container className="my-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h2 className="mb-0">Gestione Prodotti</h2>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Filtri aggiornati */}
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
                  {/* FIX: Gestisce il nuovo formato con traduzioni */}
                  {categories.map((cat, index) => (
                    <option key={index} value={cat.it}>
                      {cat.it}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Tabella Prodotti aggiornata */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status" />
              <p className="mt-2">Caricamento prodotti...</p>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Immagini</th> {/* NUOVA COLONNA */}
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
                    <td colSpan="7" className="text-center text-muted">Nessun prodotto trovato.</td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.productId}>
                      {/* NUOVA CELLA PER LE IMMAGINI */}
                      <td>
                        <ProductImages product={product} />
                      </td>

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
                          onClick={() => confirmDelete(product)}
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

      {/* Modale di conferma eliminazione */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Conferma Eliminazione</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sei sicuro di voler eliminare il prodotto <strong>{productToDelete?.nome?.it || productToDelete?.productId}</strong>?
          <br />
          <span className="text-danger small">Questa azione non può essere annullata.</span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
            Annulla
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ViewProducts;