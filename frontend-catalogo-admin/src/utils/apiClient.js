/**
 * API Client with Cognito Authentication
 * Automatically includes Cognito JWT token in all requests
 */

import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// API Base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Cognito token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get current session from Cognito
      const session = await fetchAuthSession();
      
      // ==========================================================
      // CORREZIONE CRITICA: USARE 'accessToken', NON 'idToken'
      // L'API Gateway Authorizer valida l'Access Token.
      // ==========================================================
      const token = session.tokens?.accessToken?.toString();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.warn('Failed to get auth session (user might be logged out):', error);
      // Continua senza token. Se la rotta è protetta, fallirà (correttamente)
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url,
      });

      // Handle 401 Unauthorized
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('Unauthorized/Forbidden - Token may be expired or invalid.');
        // Qui potresti voler reindirizzare al login
        // window.location.href = '/login';
      }
    } else if (error.request) {
      // Request was made but no response
      console.error('Network Error: No response received. Is the API_BASE_URL correct?');
    } else {
      // Something else happened
      console.error('Request Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;