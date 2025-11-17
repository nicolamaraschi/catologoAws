import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Row, Col, Form, Button, ListGroup, Modal, Alert, Spinner } from 'react-bootstrap';
import { 
  getSubcategoriesByCategory, 
  addSubcategory, 
  updateSubcategory, 
  deleteSubcategory,
  getAllCategories
} from '../api'; 

const SubcategoryManagement = () => {
  // Stati per i dati
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  
  // Stati per i Modal
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryTranslations, setNewSubcategoryTranslations] = useState({ it: '', en: '', fr: '', es: '', de: '' });
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [editSubcategoryName, setEditSubcategoryName] = useState('');
  const [editSubcategoryTranslations, setEditSubcategoryTranslations] = useState({});
  
  // Stati UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Carica le categorie all'avvio
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        console.log('🔍 Fetching categories...');
        const cats = await getAllCategories(); // Ora restituisce direttamente l'array
        console.log('📋 Categories received:', cats);
        
        setCategories(cats || []);
        if (cats && cats.length > 0) {
          // Usa la traduzione italiana come chiave
          setSelectedCategory(cats[0].it); 
          console.log('✅ Selected first category:', cats[0].it);
        }
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching categories:', err);
        setError('Impossibile caricare le categorie.');
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Carica le sottocategorie quando cambia la categoria selezionata
  const fetchSubcategories = useCallback(async () => {
    console.log('🔍 fetchSubcategories called with selectedCategory:', selectedCategory);
    
    if (!selectedCategory) {
      console.log('⚠️ No selected category, clearing subcategories');
      setSubcategories([]);
      return;
    }

    setLoading(true);
    try {
      setError('');
      
      console.log('🌐 Making API call to getSubcategoriesByCategory with:', selectedCategory);
      const responseData = await getSubcategoriesByCategory(selectedCategory);
      
      console.log('📦 Raw subcategories response:', responseData);
      console.log('📦 Subcategories type:', typeof responseData);
      console.log('📦 Subcategories length:', responseData?.length);
      
      setSubcategories(responseData || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in fetchSubcategories:', error);
      setError('Impossibile caricare le sottocategorie: ' + error.message);
      setSubcategories([]); 
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // Gestori selezione
  const handleCategorySelect = (categoryTranslation) => {
    setSelectedCategory(categoryTranslation);
  };
  
  // Gestori Modal (ADD)
  const handleShowAddModal = () => {
    setNewSubcategoryName('');
    setNewSubcategoryTranslations({ it: '', en: '', fr: '', es: '', de: '' });
    setError('');
    setShowAddModal(true);
  };
  
  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      setError('Il nome della sottocategoria (ID) non può essere vuoto');
      return;
    }
    try {
      setLoading(true);
      const subcategoryData = {
        subcategoryName: newSubcategoryName,
        translations: newSubcategoryTranslations
      };
      await addSubcategory(selectedCategory, subcategoryData);
      await fetchSubcategories();
      setShowAddModal(false);
      setSuccess('Sottocategoria aggiunta con successo!');
      setTimeout(() => setSuccess(''), 3000);
      setLoading(false);
    } catch (error) {
      setError('Errore nell\'aggiunta: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  // Gestori Modal (EDIT)
  const handleShowEditModal = (sub) => {
    // Ora 'sub' è direttamente l'oggetto traduzione
    setSelectedSubcategory(sub.it); // Usa la traduzione italiana come ID
    setEditSubcategoryName(sub.it);
    setEditSubcategoryTranslations(sub);
    setError('');
    setShowEditModal(true);
  };
  
  const handleEditSubcategory = async () => {
    try {
      setLoading(true);
      const subcategoryData = {
        translations: editSubcategoryTranslations
      };
      await updateSubcategory(selectedCategory, selectedSubcategory, subcategoryData);
      await fetchSubcategories();
      setShowEditModal(false);
      setSuccess('Sottocategoria aggiornata!');
      setTimeout(() => setSuccess(''), 3000);
      setLoading(false);
    } catch (error) {
      setError('Errore aggiornamento: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };
  
  // Gestori Modal (DELETE)
  const handleShowDeleteModal = (sub) => {
    setSelectedSubcategory(sub.it); // Usa la traduzione italiana come ID
    setError('');
    setShowDeleteModal(true);
  };
  
  const handleDeleteSubcategory = async () => {
    try {
      setLoading(true);
      await deleteSubcategory(selectedCategory, selectedSubcategory);
      await fetchSubcategories();
      setShowDeleteModal(false);
      setSuccess('Sottocategoria eliminata!');
      setTimeout(() => setSuccess(''), 3000);
      setLoading(false);
    } catch (error) {
      setError('Errore eliminazione: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  // Funzione helper per gestire i cambiamenti nelle traduzioni
  const handleTranslationChange = (e, lang, type) => {
    const { value } = e.target;
    if (type === 'new') {
      setNewSubcategoryTranslations(prev => ({ ...prev, [lang]: value }));
    } else {
      setEditSubcategoryTranslations(prev => ({ ...prev, [lang]: value }));
    }
  };

  return (
    <Container className="my-4">
      <h2 className="mb-4 text-center">Gestione Categorie e Sottocategorie</h2>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      <Row>
        {/* Colonna Categorie */}
        <Col lg={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Categorie</h5>
            </Card.Header>
            <Card.Body>
              {loading && categories.length === 0 ? (
                <div className="text-center">Caricamento Categorie...</div>
              ) : (
                <ListGroup>
                  {categories.map((cat, index) => (
                    <ListGroup.Item 
                      key={cat.it || index}
                      active={selectedCategory === cat.it}
                      onClick={() => handleCategorySelect(cat.it)}
                      action
                      className="d-flex justify-content-between align-items-center"
                    >
                      {cat.it}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        {/* Colonna Sottocategorie */}
        <Col lg={8}>
           <Card className="shadow-sm">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                Sottocategorie di: {selectedCategory || '...'}
              </h5>
              <Button variant="primary" size="sm" onClick={handleShowAddModal} disabled={!selectedCategory}>
                <i className="bi bi-plus-circle me-1"></i>
                Aggiungi Sottocategoria
              </Button>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-4"><Spinner animation="border" size="sm" /> Caricamento Sottocategorie...</div>
              ) : !selectedCategory ? (
                 <div className="text-center py-4 text-muted">Seleziona una categoria per iniziare.</div>
              ) : subcategories.length === 0 ? (
                <div className="text-center py-4 text-muted">Nessuna sottocategoria trovata per {selectedCategory}.</div>
              ) : (
                <ListGroup variant="flush">
                  {subcategories.map((sub, index) => (
                    <ListGroup.Item key={sub.it || index} className="d-flex justify-content-between align-items-center">
                      <span>
                        {sub.it}
                        <small className="text-muted d-block">EN: {sub.en}</small>
                      </span>
                      <div>
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditModal(sub)}>
                          <i className="bi bi-pencil"></i> Modifica
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleShowDeleteModal(sub)}>
                          <i className="bi bi-trash"></i> Elimina
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal Aggiungi Sottocategoria */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Aggiungi Sottocategoria a {selectedCategory}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>ID Sottocategoria (Univoco)</Form.Label>
              <Form.Control 
                type="text" 
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="es: Piscina (senza spazi)"
              />
              <Form.Text className="text-danger">Obbligatorio. Non modificabile dopo la creazione.</Form.Text>
            </Form.Group>
            <hr />
            <Form.Label>Traduzioni (Nome visualizzato)</Form.Label>
            <Form.Group className="mb-2">
              <Form.Control type="text" placeholder="Italiano" value={newSubcategoryTranslations.it} onChange={(e) => handleTranslationChange(e, 'it', 'new')} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Control type="text" placeholder="Inglese" value={newSubcategoryTranslations.en} onChange={(e) => handleTranslationChange(e, 'en', 'new')} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>Annulla</Button>
          <Button variant="primary" onClick={handleAddSubcategory} disabled={loading || !newSubcategoryName.trim()}>
            {loading ? 'Aggiunta...' : 'Aggiungi'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Modifica Sottocategoria */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Modifica Sottocategoria: {editSubcategoryName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>ID Sottocategoria (Non modificabile)</Form.Label>
              <Form.Control 
                type="text" 
                value={editSubcategoryName}
                disabled
              />
            </Form.Group>
            <hr />
            <Form.Label>Traduzioni (Nome visualizzato)</Form.Label>
            <Form.Group className="mb-2">
              <Form.Control type="text" placeholder="Italiano" value={editSubcategoryTranslations.it || ''} onChange={(e) => handleTranslationChange(e, 'it', 'edit')} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Control type="text" placeholder="Inglese" value={editSubcategoryTranslations.en || ''} onChange={(e) => handleTranslationChange(e, 'en', 'edit')} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Annulla</Button>
          <Button variant="primary" onClick={handleEditSubcategory} disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Conferma Eliminazione */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Conferma Eliminazione</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sei sicuro di voler eliminare la sottocategoria 
          <strong> {selectedSubcategory}</strong>? 
          L'azione è irreversibile.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Annulla</Button>
          <Button variant="danger" onClick={handleDeleteSubcategory} disabled={loading}>
            {loading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default SubcategoryManagement;