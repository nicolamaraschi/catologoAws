// frontend-catalogo-utente/src/services/api.js
import axios from 'axios';

// 🔥 HARDCODATO COMPLETAMENTE - NIENTE PIÙ ENV VARIABLES
const API_BASE_URL = 'https://nnk37tr17e.execute-api.eu-west-1.amazonaws.com/production/api/public/catalogo';

console.group('🔍 API Configuration (HARDCODED TEST)');
console.log('✅ HARDCODED API Base URL:', API_BASE_URL);
console.log('Environment:', process.env.NODE_ENV);
console.groupEnd();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor di richiesta
api.interceptors.request.use(
  (config) => {
    console.group('🌐 Request Details');
    console.log('🎯 Full Request URL:', `${config.baseURL}${config.url}`);
    console.log('Method:', config.method?.toUpperCase());
    console.groupEnd();

    return config;
  },
  (error) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// 🔥 INTERCEPTOR SUPER SEMPLIFICATO - SOLO PER TEST
api.interceptors.response.use(
  (response) => {
    console.group('✅ Response Success');
    console.log('Status:', response.status);
    console.log('URL:', response.config.url);
    console.log('Response Data Type:', Array.isArray(response.data?.data) ? 'AWS Array' : typeof response.data);
    console.log('Sample Response Keys:', Object.keys(response.data || {}).slice(0, 5));
    console.groupEnd();

    // 🔥 SUPER SEMPLICE: Se ha data.data usa quello, altrimenti usa data direttamente
    if (response.data?.data) {
      console.log('📦 Using response.data.data (AWS format)');
      return response.data.data;
    }
    
    console.log('📦 Using response.data directly');
    return response.data;
  },
  (error) => {
    console.group('❌ API Error');
    console.error('Error Message:', error.message);
    console.error('Full URL that failed:', error.config ? `${error.config.baseURL}${error.config.url}` : 'Unknown');

    if (error.response) {
      console.error('Response Status:', error.response.status);
    } else if (error.request) {
      console.error('❌ Network Error - No response received');
    }
    console.groupEnd();
    
    return Promise.reject(error);
  }
);

export default api;