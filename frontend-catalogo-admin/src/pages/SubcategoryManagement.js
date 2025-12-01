import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Row, Col, Form, Button, ListGroup, Modal, Alert, Spinner, InputGroup } from 'react-bootstrap';
import {
  getSubcategoriesByCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../api';

const SubcategoryManagement = () => {
  // Stati per i dati
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // Oggetto categoria intero
  const [subcategories, setSubcategories] = useState([]);

  // Stati per i Modal Categorie
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);

  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCategoryTranslations, setNewCategoryTranslations] = useState({ it: '', en: '', fr: '', es: '', de: '' });

  const [editCategoryOriginalId, setEditCategoryOriginalId] = useState('');
  const [editCategoryTranslations, setEditCategoryTranslations] = useState({ it: '', en: '', fr: '', es: '', de: '' });

  // Stati per i Modal Sottocategorie
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [showEditSubModal, setShowEditSubModal] = useState(false);
  const [showDeleteSubModal, setShowDeleteSubModal] = useState(false);

  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryTranslations, setNewSubcategoryTranslations] = useState({ it: '', en: '', fr: '', es: '', de: '' });

  const [selectedSubcategory, setSelectedSubcategory] = useState(null); // Oggetto sottocategoria intero
  const [editSubcategoryTranslations, setEditSubcategoryTranslations] = useState({ it: '', en: '', fr: '', es: '', de: '' });

  // Stati UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- GESTIONE CATEGORIE ---

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const cats = await getAllCategories();
      setCategories(cats || []);

      // Se non c'è una categoria selezionata (o quella selezionata non esiste più), seleziona la prima
      if (cats && cats.length > 0) {
        if (!selectedCategory || !cats.find(c => c.it === selectedCategory.it)) {
          setSelectedCategory(cats[0]);
        }
      } else {
        setSelectedCategory(null);
      }
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching categories:', err);
      setError('Impossibile caricare le categorie.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- GESTIONE SOTTOCATEGORIE ---

  const fetchSubcategories = useCallback(async () => {
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }

    setLoading(true);
    try {
      // Usa l'ID reale (categoryName) se disponibile, altrimenti fallback su IT
      const catId = selectedCategory.categoryName || selectedCategory.it;
      const responseData = await getSubcategoriesByCategory(catId);
      setSubcategories(responseData || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error in fetchSubcategories:', error);
      setError('Impossibile caricare le sottocategorie.');
      setSubcategories([]);
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);


  // --- HANDLERS CATEGORIE ---

  const handleShowAddCategory = () => {
    setNewCategoryId('');
    setNewCategoryTranslations({ it: '', en: '', fr: '', es: '', de: '' });
    setError('');
    setShowAddCategoryModal(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryId.trim() || !newCategoryTranslations.it.trim()) {
      setError('ID e Traduzione Italiana sono obbligatori.');
      return;
    }
    try {
      setLoading(true);
      const categoryData = {
        id: newCategoryId,
        ...newCategoryTranslations
      };

      await createCategory(categoryData);
      await fetchCategories();
      setShowAddCategoryModal(false);
      setSuccess('Categoria aggiunta con successo!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore creazione categoria: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleShowEditCategory = (cat) => {
    // Usa ID reale se c'è, altrimenti fallback
    setEditCategoryOriginalId(cat.categoryName || cat.it);
    setEditCategoryTranslations({ ...cat });
    setError('');
    setShowEditCategoryModal(true);
  };

  const handleEditCategory = async () => {
    try {
      setLoading(true);
      await updateCategory(editCategoryOriginalId, editCategoryTranslations);
      await fetchCategories();

      // Aggiorna anche la selezione corrente se abbiamo modificato quella
      // Nota: editCategoryOriginalId è l'ID, selectedCategory.categoryName è l'ID
      if (selectedCategory && (selectedCategory.categoryName === editCategoryOriginalId || selectedCategory.it === editCategoryOriginalId)) {
        // Aggiorna mantenendo l'ID originale
        setSelectedCategory({ ...editCategoryTranslations, categoryName: editCategoryOriginalId });
      }

      setShowEditCategoryModal(false);
      setSuccess('Categoria aggiornata!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore aggiornamento categoria: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleShowDeleteCategory = (cat) => {
    setEditCategoryOriginalId(cat.categoryName || cat.it);
    setError('');
    setShowDeleteCategoryModal(true);
  };

  const handleDeleteCategory = async () => {
    try {
      setLoading(true);
      await deleteCategory(editCategoryOriginalId);
      await fetchCategories();
      setShowDeleteCategoryModal(false);
      setSuccess('Categoria eliminata!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore eliminazione categoria: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };


  // --- HANDLERS SOTTOCATEGORIE ---

  const handleShowAddSub = () => {
    setNewSubcategoryName('');
    setNewSubcategoryTranslations({ it: '', en: '', fr: '', es: '', de: '' });
    setError('');
    setShowAddSubModal(true);
  };

  const handleAddSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      setError('ID Sottocategoria obbligatorio');
      return;
    }
    try {
      setLoading(true);
      const subData = {
        subcategoryName: newSubcategoryName,
        translations: newSubcategoryTranslations
      };
      const catId = selectedCategory.categoryName || selectedCategory.it;
      await addSubcategory(catId, subData);
      await fetchSubcategories();
      setShowAddSubModal(false);
      setSuccess('Sottocategoria aggiunta!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore aggiunta sottocategoria: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleShowEditSub = (sub) => {
    setSelectedSubcategory(sub);
    setEditSubcategoryTranslations({ ...sub });
    setError('');
    setShowEditSubModal(true);
  };

  const handleEditSubcategory = async () => {
    try {
      setLoading(true);
      const subData = {
        translations: editSubcategoryTranslations
      };
      const catId = selectedCategory.categoryName || selectedCategory.it;
      const subId = selectedSubcategory.subcategoryName || selectedSubcategory.it;

      await updateSubcategory(catId, subId, subData);
      await fetchSubcategories();
      setShowEditSubModal(false);
      setSuccess('Sottocategoria aggiornata!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore aggiornamento sottocategoria: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleShowDeleteSub = (sub) => {
    setSelectedSubcategory(sub);
    setError('');
    setShowDeleteSubModal(true);
  };

  const handleDeleteSubcategory = async () => {
    try {
      setLoading(true);
      const catId = selectedCategory.categoryName || selectedCategory.it;
      const subId = selectedSubcategory.subcategoryName || selectedSubcategory.it;

      await deleteSubcategory(catId, subId);
      await fetchSubcategories();
      setShowDeleteSubModal(false);
      setSuccess('Sottocategoria eliminata!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Errore eliminazione sottocategoria: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Helper per input traduzioni
  const renderTranslationInputs = (values, setValues) => (
    <>
      {['it', 'en', 'fr', 'es', 'de'].map(lang => (
        <InputGroup className="mb-2" key={lang}>
          <InputGroup.Text style={{ width: '50px', justifyContent: 'center' }}>
            {lang.toUpperCase()}
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder={`Nome in ${lang.toUpperCase()}`}
            value={values[lang] || ''}
            onChange={(e) => setValues(prev => ({ ...prev, [lang]: e.target.value }))}
          />
        </InputGroup>
      ))}
    </>
  );

  return (
    <Container className="my-4">
      <h2 className="mb-4 text-center">Gestione Categorie e Sottocategorie</h2>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Row>
        {/* --- COLONNA CATEGORIE --- */}
        <Col lg={5} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Categorie</h5>
              <Button variant="light" size="sm" onClick={handleShowAddCategory}>
                <i className="bi bi-plus-lg"></i> Nuova
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              {loading && categories.length === 0 ? (
                <div className="text-center p-4">Caricamento...</div>
              ) : (
                <ListGroup variant="flush">
                  {categories.map((cat, index) => {
                    const isSelected = selectedCategory && selectedCategory.it === cat.it;
                    return (
                      <ListGroup.Item
                        key={index}
                        active={isSelected}
                        className="d-flex justify-content-between align-items-center p-2"
                      >
                        <div
                          className="flex-grow-1"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          <strong>{cat.it}</strong>
                          <div className={`small ${isSelected ? 'text-white-50' : 'text-muted'}`}>
                            {['en', 'fr', 'es', 'de'].map(l => cat[l]).filter(Boolean).join(' | ')}
                          </div>
                        </div>

                        <div className="d-flex gap-2">
                          <Button
                            variant={isSelected ? "light" : "outline-primary"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowEditCategory(cat);
                            }}
                            title="Modifica Categoria"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </Button>
                          <Button
                            variant={isSelected ? "light" : "outline-danger"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDeleteCategory(cat);
                            }}
                            title="Elimina Categoria"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* --- COLONNA SOTTOCATEGORIE --- */}
        <Col lg={7}>
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                {selectedCategory ? `Sottocategorie: ${selectedCategory.it}` : 'Seleziona Categoria'}
              </h5>
              <Button variant="success" size="sm" onClick={handleShowAddSub} disabled={!selectedCategory}>
                <i className="bi bi-plus-circle me-1"></i> Aggiungi
              </Button>
            </Card.Header>
            <Card.Body>
              {!selectedCategory ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-arrow-left-circle display-4"></i>
                  <p className="mt-3">Seleziona una categoria a sinistra per gestirne le sottocategorie.</p>
                </div>
              ) : subcategories.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>Nessuna sottocategoria presente.</p>
                  <Button variant="outline-success" size="sm" onClick={handleShowAddSub}>
                    Aggiungine una ora
                  </Button>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {subcategories.map((sub, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{sub.it}</strong>
                        <div className="small text-muted">
                          {['en', 'fr', 'es', 'de'].map(l => sub[l] ? `${l.toUpperCase()}: ${sub[l]}` : null).filter(Boolean).join(' | ')}
                        </div>
                      </div>
                      <div>
                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditSub(sub)}>
                          <i className="bi bi-pencil"></i> Modifica
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleShowDeleteSub(sub)}>
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

      {/* --- MODALS CATEGORIE --- */}

      {/* ADD CATEGORY */}
      <Modal show={showAddCategoryModal} onHide={() => setShowAddCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Nuova Categoria</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>ID Categoria (es. DOMESTICO)</Form.Label>
            <Form.Control
              type="text"
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value.toUpperCase())}
              placeholder="Identificativo univoco"
            />
          </Form.Group>
          <hr />
          <h6>Traduzioni</h6>
          {renderTranslationInputs(newCategoryTranslations, setNewCategoryTranslations)}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddCategoryModal(false)}>Annulla</Button>
          <Button variant="primary" onClick={handleAddCategory} disabled={loading}>Salva</Button>
        </Modal.Footer>
      </Modal>

      {/* EDIT CATEGORY */}
      <Modal show={showEditCategoryModal} onHide={() => setShowEditCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Modifica Categoria</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Traduzioni</h6>
          {renderTranslationInputs(editCategoryTranslations, setEditCategoryTranslations)}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditCategoryModal(false)}>Annulla</Button>
          <Button variant="primary" onClick={handleEditCategory} disabled={loading}>Salva Modifiche</Button>
        </Modal.Footer>
      </Modal>

      {/* DELETE CATEGORY */}
      <Modal show={showDeleteCategoryModal} onHide={() => setShowDeleteCategoryModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Elimina Categoria</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sei sicuro di voler eliminare la categoria <strong>{editCategoryOriginalId}</strong>?
          <br />
          <span className="text-danger">Verranno eliminate anche tutte le sottocategorie associate!</span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteCategoryModal(false)}>Annulla</Button>
          <Button variant="danger" onClick={handleDeleteCategory} disabled={loading}>Elimina</Button>
        </Modal.Footer>
      </Modal>


      {/* --- MODALS SOTTOCATEGORIE --- */}

      {/* ADD SUBCATEGORY */}
      <Modal show={showAddSubModal} onHide={() => setShowAddSubModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Nuova Sottocategoria</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>ID Sottocategoria</Form.Label>
            <Form.Control
              type="text"
              value={newSubcategoryName}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              placeholder="Identificativo univoco"
            />
          </Form.Group>
          <hr />
          <h6>Traduzioni</h6>
          {renderTranslationInputs(newSubcategoryTranslations, setNewSubcategoryTranslations)}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddSubModal(false)}>Annulla</Button>
          <Button variant="success" onClick={handleAddSubcategory} disabled={loading}>Aggiungi</Button>
        </Modal.Footer>
      </Modal>

      {/* EDIT SUBCATEGORY */}
      <Modal show={showEditSubModal} onHide={() => setShowEditSubModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Modifica Sottocategoria</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Traduzioni</h6>
          {renderTranslationInputs(editSubcategoryTranslations, setEditSubcategoryTranslations)}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditSubModal(false)}>Annulla</Button>
          <Button variant="primary" onClick={handleEditSubcategory} disabled={loading}>Salva Modifiche</Button>
        </Modal.Footer>
      </Modal>

      {/* DELETE SUBCATEGORY */}
      <Modal show={showDeleteSubModal} onHide={() => setShowDeleteSubModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Elimina Sottocategoria</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sei sicuro di voler eliminare <strong>{selectedSubcategory?.it}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteSubModal(false)}>Annulla</Button>
          <Button variant="danger" onClick={handleDeleteSubcategory} disabled={loading}>Elimina</Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default SubcategoryManagement;