import axios from 'axios';

// AWS API Gateway URL base - solo il dominio e production
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://nnk37tr17e.execute-api.eu-west-1.amazonaws.com/production';

console.group('🔍 API Configuration');
console.log('Using API Base URL:', API_BASE_URL);
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
    console.log('Full Request URL:', `${config.baseURL}${config.url}`);
    console.log('Method:', config.method);
    console.groupEnd();

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor di risposta
api.interceptors.response.use(
  (response) => {
    console.group('✅ Response Success');
    console.log('Status:', response.status);
    console.log('Data Length:', JSON.stringify(response.data).length);
    console.groupEnd();

    // Le API AWS restituiscono i dati direttamente, non wrapped
    return response.data;
  },
  (error) => {
    console.group('❌ API Error');
    console.error('Error Context:', error.message);

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      console.error('Network Error - No response received');
    }

    console.groupEnd();
    return Promise.reject(error);
  }
);

export default api;