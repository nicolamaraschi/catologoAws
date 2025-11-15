import axios from 'axios';

// AWS API Gateway URL (set via environment variable in Amplify Console)
const API_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-gateway.execute-api.eu-west-1.amazonaws.com/production/api/public/catalogo';

console.group('🔍 API Configuration');
console.log('Using API URL:', API_URL);
console.groupEnd();

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased for Lambda cold starts
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

    // AWS API Gateway wraps responses in { success: true, data: {...} }
    // Extract the data field if present
    if (response.data && response.data.success === true && response.data.data) {
      return response.data.data;
    }

    return response.data;
  },
  (error) => {
    console.group('❌ API Error');
    console.error('Error Context:', error.message);

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }

    console.groupEnd();
    return Promise.reject(error);
  }
);

export default api;