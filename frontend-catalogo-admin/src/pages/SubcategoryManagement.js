// src/pages/SubcategoryManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Form, Button, Modal, Alert, InputGroup } from 'react-bootstrap';
import { FiPlus, FiEdit2, FiTrash2, FiGrid, FiArrowLeft } from 'react-icons/fi';
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
import './Dashboard.css';
import { translateText } from '../utils/openai';

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
  const [isTranslating, setIsTranslating] = useState(false);

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

  // --- AI TRANSLATION HANDLER ---
  const handleAiTranslate = async (sourceText, setTargetState) => {
    if (!sourceText) {
      setError('Inserisci il testo in italiano per tradurre.');
      return;
    }

    setIsTranslating(true);
    setError('');

    try {
      const translations = await translateText(sourceText);
      setTargetState(prev => ({
        ...prev,
        ...translations
      }));
      setSuccess('Traduzioni generate con successo!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(error);
      setError('Errore durante la traduzione automatica.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper per input traduzioni
  const renderTranslationInputs = (values, setValues) => (
    <>
      {['it', 'en', 'fr', 'es', 'de'].map(lang => (
        <InputGroup className="mb-2" key={lang}>
          <InputGroup.Text style={{ width: '50px', justifyContent: 'center', fontWeight: 'bold' }}>
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
    <div className="dashboard-container">
      <Container>
        <div className="page-header">
          <h1 className="page-title">Gestione Categorie</h1>
          <p className="page-subtitle">
            Organizza il catalogo definendo categorie principali e sottocategorie.
          </p>
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        <Row className="g-4">
          {/* --- COLONNA CATEGORIE --- */}
          <Col lg={4}>
            <div className="glass-card h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="card-title mb-0">Categorie</h3>
                <button className="btn-custom btn-primary-custom py-2 px-3" onClick={handleShowAddCategory}>
                  <FiPlus /> Nuova
                </button>
              </div>

              {loading && categories.length === 0 ? (
                <div className="text-center p-4 text-secondary">Caricamento...</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {categories.map((cat, index) => {
                    const isSelected = selectedCategory && selectedCategory.it === cat.it;
                    return (
                      <div
                        key={index}
                        className={`category-list-item p-3 d-flex justify-content-between align-items-center ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex-grow-1">
                          <div className="category-name fw-bold">{cat.it}</div>
                          <div className="small text-secondary text-truncate" style={{ maxWidth: '180px' }}>
                            {['en', 'fr', 'es', 'de'].map(l => cat[l]).filter(Boolean).join(' | ')}
                          </div>
                        </div>

                        <div className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-link text-secondary p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowEditCategory(cat);
                            }}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn btn-sm btn-link text-danger p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDeleteCategory(cat);
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Col>

          {/* --- COLONNA SOTTOCATEGORIE --- */}
          <Col lg={8}>
            <div className="glass-card h-100">
              <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <div className="d-flex align-items-center gap-3">
                  {selectedCategory && <div className="p-2 bg-light rounded-circle"><FiGrid className="text-primary" /></div>}
                  <div>
                    <h3 className="card-title mb-0">
                      {selectedCategory ? selectedCategory.it : 'Seleziona Categoria'}
                    </h3>
                    {selectedCategory && <span className="text-secondary small">Gestione Sottocategorie</span>}
                  </div>
                </div>
                <button
                  className="btn-custom btn-primary-custom py-2 px-3"
                  onClick={handleShowAddSub}
                  disabled={!selectedCategory}
                >
                  <FiPlus /> Aggiungi
                </button>
              </div>

              <div className="flex-grow-1">
                {!selectedCategory ? (
                  <div className="text-center py-5 text-secondary">
                    <FiArrowLeft size={48} className="mb-3 opacity-25" />
                    <p>Seleziona una categoria a sinistra per gestirne le sottocategorie.</p>
                  </div>
                ) : subcategories.length === 0 ? (
                  <div className="text-center py-5 text-secondary">
                    <p>Nessuna sottocategoria presente.</p>
                    <button className="btn-custom btn-outline-custom mt-2" onClick={handleShowAddSub}>
                      Aggiungine una ora
                    </button>
                  </div>
                ) : (
                  <div>
                    {subcategories.map((sub, index) => (
                      <div key={index} className="subcategory-card">
                        <div>
                          <div className="fw-bold text-dark mb-1">{sub.it}</div>
                          <div className="small text-secondary">
                            {['en', 'fr', 'es', 'de'].map(l => sub[l] ? <span key={l} className="me-2 text-uppercase badge bg-light text-dark border">{l}: {sub[l]}</span> : null)}
                          </div>
                        </div>
                        <div className="action-btn-group">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleShowEditSub(sub)}>
                            <FiEdit2 /> Modifica
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleShowDeleteSub(sub)}>
                            <FiTrash2 /> Elimina
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* --- MODALS CATEGORIE --- */}

        {/* ADD CATEGORY */}
        <Modal show={showAddCategoryModal} onHide={() => setShowAddCategoryModal(false)} className="modal-custom" centered>
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
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Traduzioni</h6>
              <Button
                variant="info"
                size="sm"
                className="text-white"
                onClick={() => handleAiTranslate(newCategoryTranslations.it, setNewCategoryTranslations)}
                disabled={isTranslating || !newCategoryTranslations.it}
              >
                {isTranslating ? '...' : '✨ Traduci'}
              </Button>
            </div>
            {renderTranslationInputs(newCategoryTranslations, setNewCategoryTranslations)}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddCategoryModal(false)}>Annulla</Button>
            <Button variant="primary" onClick={handleAddCategory} disabled={loading}>Salva</Button>
          </Modal.Footer>
        </Modal>

        {/* EDIT CATEGORY */}
        <Modal show={showEditCategoryModal} onHide={() => setShowEditCategoryModal(false)} className="modal-custom" centered>
          <Modal.Header closeButton>
            <Modal.Title>Modifica Categoria</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Traduzioni</h6>
              <Button
                variant="info"
                size="sm"
                className="text-white"
                onClick={() => handleAiTranslate(editCategoryTranslations.it, setEditCategoryTranslations)}
                disabled={isTranslating || !editCategoryTranslations.it}
              >
                {isTranslating ? '...' : '✨ Traduci'}
              </Button>
            </div>
            {renderTranslationInputs(editCategoryTranslations, setEditCategoryTranslations)}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditCategoryModal(false)}>Annulla</Button>
            <Button variant="primary" onClick={handleEditCategory} disabled={loading}>Salva Modifiche</Button>
          </Modal.Footer>
        </Modal>

        {/* DELETE CATEGORY */}
        <Modal show={showDeleteCategoryModal} onHide={() => setShowDeleteCategoryModal(false)} className="modal-custom" centered>
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
        <Modal show={showAddSubModal} onHide={() => setShowAddSubModal(false)} className="modal-custom" centered>
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
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Traduzioni</h6>
              <Button
                variant="info"
                size="sm"
                className="text-white"
                onClick={() => handleAiTranslate(newSubcategoryTranslations.it, setNewSubcategoryTranslations)}
                disabled={isTranslating || !newSubcategoryTranslations.it}
              >
                {isTranslating ? '...' : '✨ Traduci'}
              </Button>
            </div>
            {renderTranslationInputs(newSubcategoryTranslations, setNewSubcategoryTranslations)}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddSubModal(false)}>Annulla</Button>
            <Button variant="success" onClick={handleAddSubcategory} disabled={loading}>Aggiungi</Button>
          </Modal.Footer>
        </Modal>

        {/* EDIT SUBCATEGORY */}
        <Modal show={showEditSubModal} onHide={() => setShowEditSubModal(false)} className="modal-custom" centered>
          <Modal.Header closeButton>
            <Modal.Title>Modifica Sottocategoria</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Traduzioni</h6>
              <Button
                variant="info"
                size="sm"
                className="text-white"
                onClick={() => handleAiTranslate(editSubcategoryTranslations.it, setEditSubcategoryTranslations)}
                disabled={isTranslating || !editSubcategoryTranslations.it}
              >
                {isTranslating ? '...' : '✨ Traduci'}
              </Button>
            </div>
            {renderTranslationInputs(editSubcategoryTranslations, setEditSubcategoryTranslations)}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditSubModal(false)}>Annulla</Button>
            <Button variant="primary" onClick={handleEditSubcategory} disabled={loading}>Salva Modifiche</Button>
          </Modal.Footer>
        </Modal>

        {/* DELETE SUBCATEGORY */}
        <Modal show={showDeleteSubModal} onHide={() => setShowDeleteSubModal(false)} className="modal-custom" centered>
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
    </div>
  );
};

export default SubcategoryManagement;