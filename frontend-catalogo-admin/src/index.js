import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// --- INIZIO MODIFICHE AMPLIFY ---
import { Amplify } from 'aws-amplify';
import awsConfig from './aws-config'; // Importa la tua configurazione
import '@aws-amplify/ui-react/styles.css'; // Importa gli stili di Amplify

// Configura Amplify usando il tuo file aws-config.js
Amplify.configure(awsConfig); 
// --- FINE MODIFICHE AMPLIFY ---

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();