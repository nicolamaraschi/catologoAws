import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// 1. Importa l'Authenticator di Amplify
import { Authenticator } from '@aws-amplify/ui-react';

// Importa i tuoi componenti
import Navbar from './components/Navbar';
import Home from './pages/Home';
import AddProduct from './pages/AddProduct';
import EditProduct from './pages/EditProduct';
import ViewProducts from './pages/ViewProducts';
import SubcategoryManagement from './pages/SubcategoryManagement';
// 2. NON importare più ProtectedRoute
// import ProtectedRoute from './components/ProtectedRoute'; 

function App() {
  return (
    // 3. Avvolgi l'intera applicazione nell'Authenticator
    <Authenticator loginMechanisms={['email']}> 
      {({ signOut, user }) => (
        <BrowserRouter>
          {/* 4. Passa 'user' e 'signOut' alla Navbar */}
          <Navbar user={user} signOut={signOut} />
          
          <Routes>
            {/* Le tue rotte ora sono automaticamente protette */}
            <Route path="/home" element={<Home />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/edit-product/:productId" element={<EditProduct />} />
            <Route path="/view-products" element={<ViewProducts />} />
            <Route path="/subcategories" element={<SubcategoryManagement />} />
            
            {/* Reindirizza alla home se loggato */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            
            {/* Fallback per rotte non trovate */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </BrowserRouter>
      )}
    </Authenticator>
  );
}

export default App;