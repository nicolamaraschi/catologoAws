import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaTrash, FaPlus, FaImage } from 'react-icons/fa';
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
  
  // Stati per il Form (oggetti per traduzioni)
  const [nome, setNome] = useState({ it: '', en: '', fr: '', es: '', de: '' });
  const [codice, setCodice] = useState('');
  const [tipo, setTipo] = useState('');
  const [prezzo, setPrezzo] = useState(0);
  const [unita, setUnita] = useState('€/PZ'); // ⚠️ DEFAULT VALUE
  const [categoria, setCategoria] = useState({ it: '', en: '', fr: '', es: '', de: '' }); 
  const [sottocategoria, setSottocategoria] = useState({ it: '', en: '', fr: '', es: '', de: '' }); 
  const [descrizione, setDescrizione] = useState({ it: '', en: '', fr: '', es: '', de: '' });

  // Stati per le immagini
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  // Stati UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 🔒 VALORI CONSENTITI (hardcoded per sicurezza)
  const UNITA_OPTIONS = ['€/PZ', '€/KG'];
  const TIPO_OPTIONS = ['BULK', 'SECCHIO', 'CARTONE', 'FLACONE'];

  // 1. Carica il prodotto e le categorie all'avvio
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('🔍 Loading product and categories...');
        const [productData, categoriesData] = await Promise.all([
          getProdottoById(productId),
          getAllCategories()
        ]);
        
        console.log('📦 Product data received:', productData);
        console.log('📋 Categories data received:', categoriesData);
        
        setProduct(productData);
        setCategories(categoriesData || []);
        
        if (productData.immagini) {
          setExistingImages(productData.immagini);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading data:', err);
        setError("Impossibile caricare il prodotto. " + (err.message || 'Errore sconosciuto'));
        setLoading(false);
      }
    };
    loadData();
  }, [productId]);

  // 2. Popola il form quando il prodotto è caricato
  useEffect(() => {
    if (product) {
      console.log('📝 Populating form with product data:', product);
      
      setNome(product.nome || { it: '', en: '', fr: '', es: '', de: '' });
      setCodice(product.codice || '');
      setTipo(product.tipo || 'BULK');
      setPrezzo(product.prezzo || 0);
      
      // 🔧 Normalizza unita - se non è valida, usa default
      const normalizedUnita = product.unita?.trim();
      setUnita(UNITA_OPTIONS.includes(normalizedUnita) ? normalizedUnita : '€/PZ');
      
      setCategoria(product.categoria || { it: '', en: '', fr: '', es: '', de: '' });
      setSottocategoria(product.sottocategoria || { it: '', en: '', fr: '', es: '', de: '' });
      setDescrizione(product.descrizione || { it: '', en: '', fr: '', es: '', de: '' });
    }
  }, [product]);

  // 3. Carica le sottocategorie quando la categoria cambia
  const loadSubcategories = useCallback(async (categoryIt) => {
    if (!categoryIt) {
      setSubcategories([]);
      return;
    }
    try {
      console.log('🔍 Loading subcategories for:', categoryIt);
      const subData = await getSubcategoriesByCategory(categoryIt);
      console.log('📦 Subcategories received:', subData);
      setSubcategories(subData || []);
    } catch (err) {
      console.error("❌ Error loading subcategories:", err);
      setSubcategories([]);
    }
  }, []);

  useEffect(() => {
    if (categoria?.it) {
      loadSubcategories(categoria.it);
    }
  }, [categoria, loadSubcategories]);

  // Gestori per le immagini
  const handleRemoveExistingImage = (imageUrl) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
    setImagesToRemove(prev => [...prev, imageUrl]);
  };

  const handleNewImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(files);
    
    previewImages.forEach(URL.revokeObjectURL);
    const previews = files.map(file => URL.createObjectURL(file));
    setPreviewImages(previews);
  };

  const handleRemoveNewImage = (index) => {
    const newImagesList = [...newImages];
    const newPreviewsList = [...previewImages];
    
    URL.revokeObjectURL(newPreviewsList[index]);
    
    newImagesList.splice(index, 1);
    newPreviewsList.splice(index, 1);
    
    setNewImages(newImagesList);
    setPreviewImages(newPreviewsList);
  };

  useEffect(() => {
    return () => {
      previewImages.forEach(URL.revokeObjectURL);
    };
  }, [previewImages]);

  // 4. Gestore per l'aggiornamento
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      // 🔒 VALIDAZIONE CLIENT-SIDE RIGOROSA
      if (!codice.trim()) {
        throw new Error('Il codice prodotto è obbligatorio');
      }
      if (!tipo || !TIPO_OPTIONS.includes(tipo)) {
        throw new Error('Tipo prodotto non valido');
      }
      if (!unita || !UNITA_OPTIONS.includes(unita)) {
        throw new Error('Unità non valida');
      }
      if (!nome.it?.trim()) {
        throw new Error('Il nome in italiano è obbligatorio');
      }
      if (!categoria.it) {
        throw new Error('La categoria è obbligatoria');
      }

      // Prepara l'oggetto dati per l'API
      const updatedProductData = {
        nome,
        codice: codice.trim(),
        tipo, // Valore esatto dal select
        prezzo: parseFloat(prezzo),
        unita, // Valore esatto dal select (€/PZ o €/KG)
        categoria,
        sottocategoria,
        descrizione,
        keepExistingImages: existingImages,
        removeImages: imagesToRemove
      };

      console.log('🚀 Updating product with data:', updatedProductData);
      console.log('📷 New images to add:', newImages.length);
      
      await updateProdotto(productId, updatedProductData, newImages);
      
      setSuccess('Prodotto aggiornato con successo!');
      
      console.log('🔄 Reloading updated product...');
      const refreshedProductData = await getProdottoById(productId);
      
      setProduct(refreshedProductData);
      if (refreshedProductData.immagini) {
        setExistingImages(refreshedProductData.immagini);
      }
      
      setImagesToRemove([]);
      setNewImages([]);
      setPreviewImages([]);
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Update error:', err);
      const errorMessage = err.message || (err.details ? err.details[0].message : 'Errore sconosciuto');
      setError(`Errore durante l'aggiornamento: ${errorMessage}`);
      setLoading(false);
    }
  };

  // Gestore per l'eliminazione
  const handleDelete = async () => {
    if (window.confirm(`Sei sicuro di voler eliminare "${product.nome?.it}"? L'azione è irreversibile.`)) {
      try {
        await deleteProdotto(productId);
        navigate('/view-products');
      } catch (err) {
        setError("Errore durante l'eliminazione: " + (err.message || 'Errore sconosciuto'));
      }
    }
  };

  // Funzioni helper per il form
  const handleTranslationChange = (setter, lang, value) => {
    setter(prev => ({
      ...prev,
      [lang]: value
    }));
  };

  const handleCategoryChange = (e) => {
    const selectedCategoryIt = e.target.value;
    const selectedCategory = categories.find(cat => cat.it === selectedCategoryIt);
    
    if (selectedCategory) {
      setCategoria(selectedCategory);
      setSottocategoria({ it: '', en: '', fr: '', es: '', de: '' });
    }
  };

  const handleSubcategoryChange = (e) => {
    const selectedSubcategoryIt = e.target.value;
    const selectedSubcategory = subcategories.find(sub => sub.it === selectedSubcategoryIt);
    
    if (selectedSubcategory) {
      setSottocategoria(selectedSubcategory);
    }
  };

  // Render
  if (loading && !product) {
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
            <FaTrash /> Elimina
          </Button>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleUpdate}>
            
            {/* Sezione Gestione Immagini */}
            <Card className="mb-4">
              <Card.Header>
                <h5><FaImage className="me-2" />Gestione Immagini</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-4">
                  <h6>Immagini Attuali</h6>
                  {existingImages.length === 0 ? (
                    <Badge bg="secondary">Nessuna immagine presente</Badge>
                  ) : (
                    <Row>
                      {existingImages.map((imageUrl, index) => (
                        <Col xs={6} md={3} key={index} className="mb-3">
                          <Card>
                            <Card.Img 
                              variant="top" 
                              src={imageUrl}
                              style={{ height: '150px', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                            />
                            <Card.Body className="p-2 text-center">
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleRemoveExistingImage(imageUrl)}
                              >
                                <FaTrash /> Rimuovi
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>

                <div className="mb-3">
                  <h6>Aggiungi Nuove Immagini</h6>
                  <Form.Group>
                    <Form.Label>
                      <FaPlus className="me-2" />Seleziona Nuove Immagini
                    </Form.Label>
                    <Form.Control
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleNewImagesChange}
                    />
                  </Form.Group>
                </div>

                {previewImages.length > 0 && (
                  <div>
                    <h6>Anteprime Nuove Immagini</h6>
                    <Row>
                      {previewImages.map((preview, index) => (
                        <Col xs={6} md={3} key={index} className="mb-3">
                          <Card>
                            <Card.Img 
                              variant="top" 
                              src={preview}
                              style={{ height: '150px', objectFit: 'cover' }}
                            />
                            <Card.Body className="p-2 text-center">
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleRemoveNewImage(index)}
                              >
                                <FaTrash /> Rimuovi
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Sezione Nomi Tradotti */}
            <Card className="mb-4">
              <Card.Header><h5>Nome Prodotto (Traduzioni)</h5></Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Italiano <span className="text-danger">*</span></Form.Label>
                      <Form.Control 
                        type="text" 
                        value={nome.it || ''}
                        onChange={(e) => handleTranslationChange(setNome, 'it', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Inglese</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={nome.en || ''}
                        onChange={(e) => handleTranslationChange(setNome, 'en', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Francese</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={nome.fr || ''}
                        onChange={(e) => handleTranslationChange(setNome, 'fr', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Spagnolo</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={nome.es || ''}
                        onChange={(e) => handleTranslationChange(setNome, 'es', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tedesco</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={nome.de || ''}
                        onChange={(e) => handleTranslationChange(setNome, 'de', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Sezione Dettagli */}
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Codice Prodotto <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="text" 
                    value={codice}
                    onChange={(e) => setCodice(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Tipo <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    required
                  >
                    {TIPO_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Prezzo <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    type="number" 
                    step="0.01"
                    value={prezzo}
                    onChange={(e) => setPrezzo(e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Unità <span className="text-danger">*</span></Form.Label>
                  <Form.Select 
                    value={unita}
                    onChange={(e) => setUnita(e.target.value)}
                    required
                  >
                    {UNITA_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Sezione Categorie */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Categoria <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={categoria.it || ''} 
                    onChange={handleCategoryChange}
                    required
                  >
                    <option value="">Seleziona una categoria</option>
                    {categories.map((cat, index) => (
                      <option key={index} value={cat.it}>
                        {cat.it}
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
                    onChange={handleSubcategoryChange}
                    disabled={!categoria.it || subcategories.length === 0}
                  >
                    <option value="">Seleziona una sottocategoria</option>
                    {subcategories.map((sub, index) => (
                      <option key={index} value={sub.it}>
                        {sub.it}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Sezione Descrizioni */}
            <Card className="mb-4">
              <Card.Header><h5>Descrizione (Traduzioni)</h5></Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Italiano</Form.Label>
                      <Form.Control 
                        as="textarea"
                        rows={3}
                        value={descrizione.it || ''}
                        onChange={(e) => handleTranslationChange(setDescrizione, 'it', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Inglese</Form.Label>
                      <Form.Control 
                        as="textarea"
                        rows={3}
                        value={descrizione.en || ''}
                        onChange={(e) => handleTranslationChange(setDescrizione, 'en', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Francese</Form.Label>
                      <Form.Control 
                        as="textarea"
                        rows={3}
                        value={descrizione.fr || ''}
                        onChange={(e) => handleTranslationChange(setDescrizione, 'fr', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Spagnolo</Form.Label>
                      <Form.Control 
                        as="textarea"
                        rows={3}
                        value={descrizione.es || ''}
                        onChange={(e) => handleTranslationChange(setDescrizione, 'es', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tedesco</Form.Label>
                      <Form.Control 
                        as="textarea"
                        rows={3}
                        value={descrizione.de || ''}
                        onChange={(e) => handleTranslationChange(setDescrizione, 'de', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
            
            <hr />
            <div className="text-end">
              <Button variant="secondary" onClick={() => navigate('/view-products')} className="me-2">
                Annulla
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner as="span" size="sm" className="me-2" /> : ''}
                {loading ? 'Salvataggio...' : 'Salva Modifiche'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EditProduct;