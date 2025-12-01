import axios from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth'; 

// 1. Ora legge l'URL dal file .env (che hai creato)
const API_URL = process.env.REACT_APP_API_BASE_URL;

console.group('🔍 API Configuration (Admin)');
console.log('Using Admin API URL:', API_URL);
console.groupEnd();

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// INTERCEPTOR DI RICHIESTA (Aggiunge il token)
api.interceptors.request.use(
  async (config) => {
    console.group('🌐 Request Details');
    console.log('Full Request URL:', `${config.baseURL}${config.url}`);
    
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Nessuna sessione Amplify attiva trovata:', error);
    }

    console.groupEnd();
    return config;
  },
  (error) => Promise.reject(error)
);

// =================================================================
// 2. INTERCEPTOR DI RISPOSTA CON LOG DI DEBUG
// =================================================================
api.interceptors.response.use(
  (response) => {
    // 🔍 LOG DI DEBUG PER VEDERE IL FORMATO DATI
    console.group('📦 Response Data Debug');
    console.log('Raw response.data:', response.data);
    console.log('response.data type:', typeof response.data);
    console.log('response.data.data exists?', response.data.data !== undefined);
    if (response.data.data) {
      console.log('response.data.data type:', typeof response.data.data);
      console.log('response.data.data is array?', Array.isArray(response.data.data));
      console.log('response.data.data length:', response.data.data?.length);
      if (response.data.data.length > 0) {
        console.log('First item:', response.data.data[0]);
      }
    }
    console.groupEnd();
    
    // Come visto nei tuoi log, la risposta è { data: [...] }.
    // Noi vogliamo restituire solo l'array all'interno.
    if (response.data && response.data.data !== undefined) {
      // Restituisce solo l'array incapsulato
      return response.data.data;
    }
    
    // Se la risposta non ha 'data.data' (es. un GET by ID), 
    // restituisci l'intero response.data
    return response.data;
  },
  (error) => {
    console.group('❌ API Error');
    console.error('Error Context:', error.message);

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('Token non autorizzato! Logout in corso.');
        signOut(); 
      }
    }
    console.groupEnd();
    return Promise.reject(error);
  }
);
// =================================================================

// --- FUNZIONI API ---

// --- CRUD PRODOTTI ---
export const createProdotto = async (prodottoData, immagini = []) => {
  try {
    const formData = new FormData();
    
    // 1. Aggiungi tutti i campi come JSON stringificato
    Object.keys(prodottoData).forEach(key => {
      const value = prodottoData[key];

      if (value === undefined) {
        return; 
      } 
      
      if (typeof value === 'object' && value !== null) {
        // Stringify per oggetti e array (nome, descrizione, categoria, ecc.)
        formData.append(key, JSON.stringify(value));
      } else {
        // Valori semplici (codice, prezzo, tipo, ecc.)
        formData.append(key, value);
      }
    });
    
    // 2. Aggiungi le immagini
    if (immagini && immagini.length > 0) {
      immagini.forEach((file) => {
        formData.append('immagini', file); 
      });
      console.log(`📷 Added ${immagini.length} images to FormData`);
    } else {
      console.warn('⚠️ No images provided to createProdotto');
    }

    // 3. DEBUG - Verifica FormData
    console.log('--- DEBUG: FormData Content ---');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(key, ':', `File: ${value.name} (${value.size} bytes)`);
      } else {
        console.log(key, ':', value);
      }
    }
    console.log('--- END DEBUG ---');

    // 4. Invia con Content-Type multipart/form-data
    const response = await api.post('/prodotti', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('✅ API: Product created:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ API: Error creating product:', error.response?.data || error);
    throw error.response?.data?.error || error;
  }
};
export const getAllProdotti = () => api.get('/prodotti');
export const getProdottoById = (productId) => api.get(`/prodotti/${productId}`);
// SOSTITUISCI la vecchia funzione updateProdotto in api.js con questa:

export const updateProdotto = async (id, prodottoData, immagini = []) => {
  try {
    const formData = new FormData();
    
    Object.keys(prodottoData).forEach(key => {
      const value = prodottoData[key];
      if (value === undefined) return;
      
      if (typeof value === 'object' && value !== null) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    
    if (immagini?.length > 0) {
      immagini.forEach((file) => formData.append('immagini', file));
    }

    // ⚠️ QUESTO È IL PEZZO CRITICO CHE MANCAVA ⚠️
    const response = await api.put(`/prodotti/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;

  } catch (error) {
    console.error('❌ Error updating product:', error.response?.data || error);
    throw error.response?.data?.error || error;
  }
};
export const deleteProdotto = (productId) => api.delete(`/prodotti/${productId}`);

// --- CATEGORIE & SOTTOCATEGORIE (I TUOI ENDPOINT CHE FUNZIONANO) ---
export const getAllCategories = () => {
  console.log('🔍 Calling getAllCategories...');
  return api.get('/categorie');
};

export const getSubcategoriesByCategory = (category) => {
  console.log('🔍 Calling getSubcategoriesByCategory for:', category);
  return api.get(`/categorie/${category}/sottocategorie`);
};

export const addSubcategory = (category, subcategoryData) => {
  return api.post(`/categorie/${category}/sottocategorie`, subcategoryData);
};
export const updateSubcategory = (category, subcategoryName, subcategoryData) => {
  return api.put(`/categorie/${category}/sottocategorie/${subcategoryName}`, subcategoryData);
};
export const deleteSubcategory = (category, subcategoryName) => {
  return api.delete(`/categorie/${category}/sottocategorie/${subcategoryName}`);
};

export const createCategory = (categoryData) => api.post('/categorie', categoryData);
export const updateCategory = (categoryName, categoryData) => api.put(`/categorie/${categoryName}`, categoryData);
export const deleteCategory = (categoryName) => api.delete(`/categorie/${categoryName}`);

// Funzione Upload
export const getPresignedUrl = (uploadData) => api.post('/upload/presigned-url', uploadData);

// Esportazione di default
export default api;