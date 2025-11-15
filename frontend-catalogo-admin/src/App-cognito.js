import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import awsConfig from './aws-config';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AddProduct from './pages/AddProduct';
import ViewProducts from './pages/ViewProducts';
import EditProduct from './pages/EditProduct';
import SubcategoryManagement from './pages/SubcategoryManagement';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Configure Amplify
Amplify.configure(awsConfig);

const App = () => {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Router>
          <div>
            <Navbar user={user} signOut={signOut} />
            <Routes>
              {/* Route principale */}
              <Route path="/" element={<Navigate to="/home" replace />} />

              {/* Routes protette - tutte richiedono autenticazione Cognito */}
              <Route path="/home" element={<Home user={user} />} />
              <Route path="/add-product" element={<AddProduct user={user} />} />
              <Route path="/view-products" element={<ViewProducts user={user} />} />
              <Route path="/edit-product" element={<EditProduct user={user} />} />
              <Route path="/categories" element={<SubcategoryManagement user={user} />} />

              {/* Route di fallback */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </Router>
      )}
    </Authenticator>
  );
};

export default App;
