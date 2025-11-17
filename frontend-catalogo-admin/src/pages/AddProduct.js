import React, { useState, useEffect } from 'react';
import { createProdotto, getSubcategoriesByCategory, getAllCategories } from '../api';
import { Form, Button, Container, Row, Col, Card, Alert } from 'react-bootstrap';

const AddProduct = () => {
  const [formData, setFormData] = useState({
    nome: { it: '', en: '', fr: '', es: '', de: '' }, // OGGETTO TRADUZIONI
    codice: '',
    tipo: '',
    prezzo: '',
    unita: '',
    categoria: { it: '', en: '', fr: '', es: '', de: '' }, // OGGETTO TRADUZIONI
    sottocategoria: { it: '', en: '', fr: '', es: '', de: '' }, // OGGETTO TRADUZIONI
    tipoImballaggio: '',
    pezziPerCartone: '',
    cartoniPerEpal: '',
    pezziPerEpal: '',
    descrizione: { it: '', en: '', fr: '', es: '', de: '' } // OGGETTO TRADUZIONI
  });
  
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [immagini, setImmagini] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const tipiProdotto = [
    'BULK',
    'BARATTOLO',
    'SECCHIO',
    'ASTUCCIO VUOTO',
    'ASTUCCIO PERSONALIZZATO',
    'MONODOSE CARTA'
  ];
  
  const unitaMisura = ['€/KG', '€/PZ'];
  
  const tipiImballaggio = [
    'Barattolo 1kg',
    'BigBag 600kg',
    'Flacone 750g',
    'Sacco 10kg',
    'Sacco 20kg',
    'Secchio 200tabs',
    'Secchio 3.6kg',
    'Secchio 4kg',
    'Secchio 5kg',
    'Secchio 6kg',
    'Secchio 8kg',
    'Secchio 9kg',
    'Secchio 10kg',
    'Astuccio 100g',
    'Astuccio 700g',
    'Astuccio 2400g',
    'Astuccio 900g',
    'Astuccio 200g',
    'Flacone 500ml',
    'Flacone Trigger 750ml',
    'Tanica 1000l',
    'Flacone 5l',
    'Fustone 5.6kg',
    'Cartone 400tabs'
  ];
  
  const packagingDefaults = {
    'Barattolo 1kg': { pezziPerCartone: 6, cartoniPerEpal: 40, pezziPerEpal: 240 },
    'BigBag 600kg': { pezziPerCartone: 1, cartoniPerEpal: 1, pezziPerEpal: 1 },
    'Flacone 750g': { pezziPerCartone: 15, cartoniPerEpal: 55, pezziPerEpal: 825 },
    'Sacco 10kg': { pezziPerCartone: 1, cartoniPerEpal: 60, pezziPerEpal: 60 },
    'Sacco 20kg': { pezziPerCartone: 1, cartoniPerEpal: 30, pezziPerEpal: 30 },
    'Secchio 200tabs': { pezziPerCartone: 3, cartoniPerEpal: 20, pezziPerEpal: 60 },
    'Secchio 3.6kg': { pezziPerCartone: 1, cartoniPerEpal: 200, pezziPerEpal: 200 },
    'Secchio 4kg': { pezziPerCartone: 1, cartoniPerEpal: 72, pezziPerEpal: 72 },
    'Secchio 5kg': { pezziPerCartone: 1, cartoniPerEpal: 72, pezziPerEpal: 72 },
    'Secchio 6kg': { pezziPerCartone: 1, cartoniPerEpal: 72, pezziPerEpal: 72 },
    'Secchio 8kg': { pezziPerCartone: 1, cartoniPerEpal: 36, pezziPerEpal: 36 },
    'Secchio 9kg': { pezziPerCartone: 1, cartoniPerEpal: 36, pezziPerEpal: 36 },
    'Secchio 10kg': { pezziPerCartone: 1, cartoniPerEpal: 72, pezziPerEpal: 72 },
    'Astuccio 100g': { pezziPerCartone: 100, cartoniPerEpal: 1, pezziPerEpal: 100 },
    'Astuccio 700g': { pezziPerCartone: 12, cartoniPerEpal: 72, pezziPerEpal: 864 },
    'Astuccio 2400g': { pezziPerCartone: 4, cartoniPerEpal: 50, pezziPerEpal: 200 },
    'Astuccio 900g': { pezziPerCartone: 12, cartoniPerEpal: 60, pezziPerEpal: 720 },
    'Astuccio 200g': { pezziPerCartone: 8, cartoniPerEpal: 135, pezziPerEpal: 1080 },
    'Flacone 500ml': { pezziPerCartone: 12, cartoniPerEpal: 48, pezziPerEpal: 576 },
    'Flacone Trigger 750ml': { pezziPerCartone: 12, cartoniPerEpal: 40, pezziPerEpal: 480 },
    'Tanica 1000l': { pezziPerCartone: 1, cartoniPerEpal: 1, pezziPerEpal: 1 },
    'Flacone 5l': { pezziPerCartone: 4, cartoniPerEpal: 34, pezziPerEpal: 136 },
    'Fustone 5.6kg': { pezziPerCartone: 1, cartoniPerEpal: 84, pezziPerEpal: 84 },
    'Cartone 400tabs': { pezziPerCartone: 1, cartoniPerEpal: 60, pezziPerEpal: 60 }
  };
  
  // Carica le categorie all'avvio
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log('🔍 Fetching categories in AddProduct...');
        const cats = await getAllCategories();
        console.log('📋 Categories received in AddProduct:', cats);
        setCategories(cats || []);
      } catch (error) {
        console.error('❌ Error fetching categories in AddProduct:', error);
        setErrorMessage('Impossibile caricare le categorie');
      }
    };
    fetchCategories();
  }, []);
  
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (formData.categoria.it) { // CAMBIATO: controlla categoria.it
        try {
          setIsLoading(true);
          console.log('🔍 Fetching subcategories for:', formData.categoria.it);
          const data = await getSubcategoriesByCategory(formData.categoria.it);
          console.log('📦 Subcategories received:', data);
          setSubcategories(data || []);
          setIsLoading(false);
        } catch (error) {
          console.error('Errore nel caricamento delle sottocategorie:', error);
          setErrorMessage('Impossibile caricare le sottocategorie');
          setIsLoading(false);
        }
      } else {
        setSubcategories([]);
      }
    };
    
    fetchSubcategories();
  }, [formData.categoria.it]); // CAMBIATO: dipende da categoria.it
  
  useEffect(() => {
    if (formData.pezziPerCartone && formData.cartoniPerEpal) {
      const pezziPerEpal = parseInt(formData.pezziPerCartone) * parseInt(formData.cartoniPerEpal);
      setFormData(prev => ({
        ...prev,
        pezziPerEpal
      }));
    }
  }, [formData.pezziPerCartone, formData.cartoniPerEpal]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'tipoImballaggio' && packagingDefaults[value]) {
      const defaults = packagingDefaults[value];
      setFormData({
        ...formData,
        [name]: value,
        pezziPerCartone: defaults.pezziPerCartone,
        cartoniPerEpal: defaults.cartoniPerEpal,
        pezziPerEpal: defaults.pezziPerEpal
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // NUOVA FUNZIONE per gestire le traduzioni
  const handleTranslationChange = (field, lang, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value
      }
    }));
  };

  // NUOVA FUNZIONE per gestire il cambio categoria
  const handleCategoryChange = (e) => {
    const selectedCategoryIt = e.target.value;
    const selectedCategory = categories.find(cat => cat.it === selectedCategoryIt);
    
    if (selectedCategory) {
      setFormData(prev => ({
        ...prev,
        categoria: selectedCategory,
        sottocategoria: { it: '', en: '', fr: '', es: '', de: '' } // Reset sottocategoria
      }));
    }
  };

  // NUOVA FUNZIONE per gestire il cambio sottocategoria
  const handleSubcategoryChange = (e) => {
    const selectedSubcategoryIt = e.target.value;
    const selectedSubcategory = subcategories.find(sub => sub.it === selectedSubcategoryIt);
    
    if (selectedSubcategory) {
      setFormData(prev => ({
        ...prev,
        sottocategoria: selectedSubcategory
      }));
    }
  };
  
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImmagini(files);
    
    const previews = files.map(file => URL.createObjectURL(file));
    setPreviewImages(previews);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // 🔒 VALIDAZIONE CLIENT-SIDE RIGOROSA
    try {
      // Campi obbligatori
      if (!formData.nome.it?.trim()) {
        throw new Error('Il nome in italiano è obbligatorio');
      }
      if (!formData.codice?.trim()) {
        throw new Error('Il codice prodotto è obbligatorio');
      }
      if (!formData.tipo || !tipiProdotto.includes(formData.tipo)) {
        throw new Error('Tipo prodotto non valido');
      }
      if (!formData.unita || !unitaMisura.includes(formData.unita)) {
        throw new Error('Unità non valida');
      }
      if (!formData.prezzo || parseFloat(formData.prezzo) <= 0) {
        throw new Error('Il prezzo deve essere maggiore di zero');
      }
      if (!formData.categoria.it) {
        throw new Error('La categoria è obbligatoria');
      }
      if (!formData.tipoImballaggio) {
        throw new Error('Il tipo di imballaggio è obbligatorio');
      }
      if (!formData.pezziPerCartone || parseInt(formData.pezziPerCartone) < 1) {
        throw new Error('Pezzi per cartone deve essere almeno 1');
      }
      if (!formData.cartoniPerEpal || parseInt(formData.cartoniPerEpal) < 1) {
        throw new Error('Cartoni per epal deve essere almeno 1');
      }
      if (immagini.length === 0) {
        throw new Error('Devi caricare almeno un\'immagine');
      }
  
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // 🛡️ FUNZIONE DI SANITIZZAZIONE - Auto-compila traduzioni mancanti
      const sanitizeTranslations = (obj, fieldType = 'required') => {
        const itValue = obj?.it?.trim() || '';
        
        // Per campi obbligatori con valore IT, replica su tutte le lingue
        if (fieldType === 'required' && itValue) {
          return {
            it: itValue,
            en: obj?.en?.trim() || itValue,
            fr: obj?.fr?.trim() || itValue,
            es: obj?.es?.trim() || itValue,
            de: obj?.de?.trim() || itValue
          };
        } 
        
        // Per sottocategoria opzionale, usa "N/A" se vuota
        if (fieldType === 'optional') {
          const hasValue = itValue !== '';
          if (hasValue) {
            return {
              it: itValue,
              en: obj?.en?.trim() || itValue,
              fr: obj?.fr?.trim() || itValue,
              es: obj?.es?.trim() || itValue,
              de: obj?.de?.trim() || itValue
            };
          } else {
            // Sottocategoria vuota = N/A in tutte le lingue
            return {
              it: 'N/A',
              en: 'N/A',
              fr: 'N/A',
              es: 'N/A',
              de: 'N/A'
            };
          }
        }
  
        // Fallback generico
        return {
          it: itValue || 'N/A',
          en: obj?.en?.trim() || itValue || 'N/A',
          fr: obj?.fr?.trim() || itValue || 'N/A',
          es: obj?.es?.trim() || itValue || 'N/A',
          de: obj?.de?.trim() || itValue || 'N/A'
        };
      };
  
      // 🔒 PREPARA DATI CON VALIDAZIONE ESATTA E COMPLETA
      const productData = {
        nome: sanitizeTranslations(formData.nome, 'required'),
        codice: formData.codice.trim(),
        tipo: formData.tipo,
        prezzo: parseFloat(formData.prezzo),
        unita: formData.unita,
        categoria: sanitizeTranslations(formData.categoria, 'required'),
        sottocategoria: sanitizeTranslations(formData.sottocategoria, 'optional'), // SEMPRE PRESENTE
        tipoImballaggio: formData.tipoImballaggio,
        pezziPerCartone: parseInt(formData.pezziPerCartone),
        cartoniPerEpal: parseInt(formData.cartoniPerEpal),
        pezziPerEpal: parseInt(formData.pezziPerEpal),
        descrizione: sanitizeTranslations(formData.descrizione, 'required')
      };
  
      // 🔍 LOG PRE-INVIO
      console.log('📋 === DATI PRODOTTO PRE-INVIO ===');
      console.log(JSON.stringify(productData, null, 2));
      console.log('📷 Numero immagini:', immagini.length);
      console.log('================================');
  
      // 🚀 INVIO RICHIESTA
      await createProdotto(productData, immagini);
      
      // ✅ SUCCESSO - RESET FORM
      setFormData({
        nome: { it: '', en: '', fr: '', es: '', de: '' },
        codice: '',
        tipo: 'BULK',
        prezzo: '',
        unita: '€/PZ',
        categoria: { it: '', en: '', fr: '', es: '', de: '' },
        sottocategoria: { it: '', en: '', fr: '', es: '', de: '' },
        tipoImballaggio: '',
        pezziPerCartone: '',
        cartoniPerEpal: '',
        pezziPerEpal: '',
        descrizione: { it: '', en: '', fr: '', es: '', de: '' }
      });
      
      setImmagini([]);
      previewImages.forEach(URL.revokeObjectURL);
      setPreviewImages([]);
      
      setSuccessMessage('✅ Prodotto aggiunto con successo!');
      
      // Auto-nascondi messaggio dopo 5 secondi
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('❌ === ERRORE CREAZIONE PRODOTTO ===');
      console.error('Messaggio:', error.message);
      console.error('Dettagli:', error.response?.data || error);
      console.error('====================================');
      
      // Estrai messaggio errore dettagliato
      let errorMsg = 'Si è verificato un errore durante il salvataggio del prodotto.';
      
      if (error.response?.data?.error?.details) {
        const details = error.response.data.error.details;
        errorMsg = `Errore di validazione:\n${details.map(d => `- ${d.field}: ${d.message}`).join('\n')}`;
      } else if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    return () => {
      previewImages.forEach(URL.revokeObjectURL);
    };
  }, [previewImages]);
  
  return (
    <Container className="mt-4">
      <h2 className="mb-4">Aggiungi Nuovo Prodotto</h2>
      
      {successMessage && (
        <Alert variant="success">{successMessage}</Alert>
      )}
      
      {errorMessage && (
        <Alert variant="danger">{errorMessage}</Alert>
      )}
      
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* SEZIONE NOME PRODOTTO CON TRADUZIONI */}
            <Card className="mb-4">
              <Card.Header>
                <h5>Nome Prodotto (Traduzioni) *</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Italiano *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.nome.it}
                        onChange={(e) => handleTranslationChange('nome', 'it', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Inglese</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.nome.en}
                        onChange={(e) => handleTranslationChange('nome', 'en', e.target.value)}
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
                        value={formData.nome.fr}
                        onChange={(e) => handleTranslationChange('nome', 'fr', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Spagnolo</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.nome.es}
                        onChange={(e) => handleTranslationChange('nome', 'es', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tedesco</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.nome.de}
                        onChange={(e) => handleTranslationChange('nome', 'de', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Codice Prodotto *</Form.Label>
                  <Form.Control
                    type="text"
                    name="codice"
                    value={formData.codice}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleziona un tipo</option>
                    {tipiProdotto.map((tipo, index) => (
                      <option key={index} value={tipo}>{tipo}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoria *</Form.Label>
                  <Form.Select
                    value={formData.categoria.it}
                    onChange={handleCategoryChange}
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map((cat, index) => (
                      <option key={index} value={cat.it}>
                        {cat.it}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sottocategoria *</Form.Label>
                  <Form.Select
                    value={formData.sottocategoria.it}
                    onChange={handleSubcategoryChange}
                    disabled={!formData.categoria.it || subcategories.length === 0}
                    required={formData.categoria.it && subcategories.length > 0}
                  >
                    <option value="">Seleziona sottocategoria</option>
                    {subcategories.map((subcat, index) => (
                      <option key={index} value={subcat.it}>
                        {subcat.it}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prezzo *</Form.Label>
                  <Form.Control
                    type="number"
                    name="prezzo"
                    value={formData.prezzo}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Unità di Misura *</Form.Label>
                  <Form.Select
                    name="unita"
                    value={formData.unita}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleziona unità</option>
                    {unitaMisura.map((unita, index) => (
                      <option key={index} value={unita}>{unita}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo Imballaggio *</Form.Label>
                  <Form.Select
                    name="tipoImballaggio"
                    value={formData.tipoImballaggio}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleziona tipo imballaggio</option>
                    {tipiImballaggio.map((tipo, index) => (
                      <option key={index} value={tipo}>{tipo}</option>
                    ))}
                 </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pezzi Per Cartone *</Form.Label>
                  <Form.Control
                    type="number"
                    name="pezziPerCartone"
                    value={formData.pezziPerCartone}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Cartoni Per Epal *</Form.Label>
                  <Form.Control
                    type="number"
                    name="cartoniPerEpal"
                    value={formData.cartoniPerEpal}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pezzi Per Epal</Form.Label>
                  <Form.Control
                    type="number"
                    name="pezziPerEpal"
                    value={formData.pezziPerEpal}
                    readOnly
                  />
                  <Form.Text className="text-muted">
                    Calcolato automaticamente
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            {/* SEZIONE DESCRIZIONE CON TRADUZIONI */}
            <Card className="mb-4">
              <Card.Header>
                <h5>Descrizione (Traduzioni)</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Italiano</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={formData.descrizione.it}
                        onChange={(e) => handleTranslationChange('descrizione', 'it', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Inglese</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={formData.descrizione.en}
                        onChange={(e) => handleTranslationChange('descrizione', 'en', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
            
            <Form.Group className="mb-3">
              <Form.Label>Immagini Prodotto *</Form.Label>
              <Form.Control
                type="file"
                onChange={handleImageChange}
                multiple
                accept="image/*"
                required
              />
              <Form.Text className="text-muted">
                Puoi selezionare più immagini. Formati supportati: JPG, PNG, GIF.
              </Form.Text>
            </Form.Group>
            
            {previewImages.length > 0 && (
              <div className="mb-3">
                <p>Anteprime:</p>
                <div className="d-flex flex-wrap gap-2">
                  {previewImages.map((preview, index) => (
                    <img
                      key={index}
                      src={preview}
                      alt={`Anteprima ${index + 1}`}
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                      className="img-thumbnail"
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Salvataggio in corso...' : 'Salva Prodotto'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AddProduct;