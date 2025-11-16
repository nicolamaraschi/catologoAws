import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { 
  getProdottoById, 
  updateProdotto, 
  deleteProdotto, 
  getAllCategories, 
  getSubcategoriesByCategory 
} from '../api';

const EditProduct = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  // Stato per i dati caricati
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  
  // Stati per il Form 
  const [nome, setNome] = useState({ it: '', en: '', fr: '', es: '', de: '' });
  const [codice, setCodice] = useState('');
  const [tipo, setTipo] = useState('');
  const [prezzo, setPrezzo] = useState(0);
  const [unita, setUnita] = useState('');
  const [categoria, setCategoria] = useState({ it: '', en: '' }); 
  const [sottocategoria, setSottocategoria] = useState({ it: '', en: '' }); 
  const [descrizione, setDescrizione] = useState({ it: '', en: '' });

  // Stati UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Carica il prodotto e le categorie all'avvio
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [productData, categoriesData] = await Promise.all([
          getProdottoById(productId),
          getAllCategories()
        ]);
        
        setProduct(productData);
        setCategories(categoriesData || []);
        setLoading(false);
      } catch (err) {
        setError("Impossibile caricare il prodotto. " + err.message);
        setLoading(false);
      }
    };
    loadData();
  }, [productId]);

  // 2. Popola il form SOLO quando 'product' è stato caricato
  useEffect(() => {
    if (product) {
      setNome(product.nome || { it: '' });
      setCodice(product.codice || '');
      setTipo(product.tipo || '');
      setPrezzo(product.prezzo || 0);
      setUnita(product.unita || '');
      setCategoria(product.categoria || { it: '' });
      setSottocategoria(product.sottocategoria || { it: '' });
      setDescrizione(product.descrizione || { it: '' });
    }
  }, [product]);

  // 3. Carica le sottocategorie quando la categoria cambia
  const loadSubcategories = useCallback(async (categoryName) => {
    // 
    // 1. FIX PRINCIPALE: Se il nome è vuoto, svuota le sottocategorie e fermati.
    // 
    if (!categoryName) {
      setSubcategories([]);
      return;
    }

    try {
      const selectedCat = categories.find(c => c.translations?.it === categoryName);
      if (selectedCat) {
        const subData = await getSubcategoriesByCategory(selectedCat.categoryName);
        setSubcategories(subData || []);
      }
    } catch (err) {
      console.error("Errore caricamento sottocategorie:", err);
    }
  }, [categories]);

  useEffect(() => {
    if (categoria?.it) {
      loadSubcategories(categoria.it);
    }
  }, [categoria, loadSubcategories]);


  // Gestore per l'aggiornamento
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    const updatedProduct = {
      nome,
      codice,
      tipo,
      prezzo: parseFloat(prezzo),
      unita,
      categoria,
      sottocategoria,
      descrizione,
    };

    try {
      await updateProdotto(productId, updatedProduct);
      setSuccess('Prodotto aggiornato con successo!');
      setLoading(false);
    } catch (err) {
      setError('Errore durante l\'aggiornamento: ' + err.message);
      setLoading(false);
    }
  };

  // Gestore per la cancellazione
  const handleDelete = async () => {
    if (window.confirm(`Sei sicuro di voler eliminare questo prodotto? L'azione è irreversibile.`)) {
      try {
        await deleteProdotto(productId);
        navigate('/view-products'); // Torna alla lista
      } catch (err) {
        setError("Errore durante l'eliminazione: " + err.message);
      }
    }
  };

  // Gestore per i campi di traduzione (come 'nome')
  const handleTranslationChange = (e, field) => {
    const { name, value } = e.target;
    field(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading || !product) {
    return (
      <Container className="my-4 text-center">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Caricamento prodotto...</p>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h2 className="mb-0">Modifica Prodotto: {product.nome?.it}</h2>
          <Button variant="outline-danger" onClick={handleDelete}>
            Elimina Prodotto
          </Button>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleUpdate}>
            {/* Sezione Nomi Tradotti */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nome (IT)</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="it"
                    value={nome.it}
                    onChange={(e) => handleTranslationChange(e, setNome)} 
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Nome (EN)</Form.Label>
                  <Form.Control 
                    type="text" 
                    name="en"
                    value={nome.en}
                    onChange={(e) => handleTranslationChange(e, setNome)} 
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Sezione Dettagli */}
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Codice Prodotto</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={codice}
                    onChange={(e) => setCodice(e.target.value)} 
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Prezzo</Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01"
                    value={prezzo}
                    onChange={(e) => setPrezzo(e.target.value)} 
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Unità</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="es: €/PZ"
                    value={unita}
                    onChange={(e) => setUnita(e.target.value)} 
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Sezione Categorie */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Categoria</Form.Label>
                  <Form.Select
                    value={categoria.it || ''} 
                    onChange={(e) => {
                      const selectedCatIt = e.target.value;
                      const selectedCat = categories.find(c => c.translations?.it === selectedCatIt) || {};
                      setCategoria(selectedCat.translations || { it: selectedCatIt }); 
                      
                      // 2. FIX SECONDARIO: Resetta la sottocategoria quando cambi la categoria
                      setSottocategoria({ it: '' }); 
                      
                      loadSubcategories(selectedCatIt); 
                    }}
                  >
                    <option value="">Seleziona una categoria</option>
                    {categories.map((cat, index) => (
                      <option key={cat.categoryName || index} value={cat.translations?.it}>
                        {cat.translations?.it || cat.categoryName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Sottocategoria</Form.Label>
                  <Form.Select
                    value={sottocategoria.it || ''} 
                    onChange={(e) => {
                      const selectedSubIt = e.target.value;
                      const selectedSub = subcategories.find(s => s.translations?.it === selectedSubIt) || {};
                      setSottocategoria(selectedSub.translations || { it: selectedSubIt }); 
                    }}
                    disabled={subcategories.length === 0}
                  >
                    <option value="">Seleziona una sottocategoria</option>
                    {subcategories.map((sub, index) => (
                      <option key={sub.subcategoryName || index} value={sub.translations?.it}>
                        {sub.translations?.it || sub.subcategoryName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <hr />
            <div className="text-end">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner as="span" size="sm" /> : 'Salva Modifiche'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EditProduct;