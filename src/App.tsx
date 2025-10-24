import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboard from './pages/RestaurantDashboard';
import RestaurantMenu from './pages/RestaurantMenu';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/ToastProvider';
import PublicMenuPage from './pages/PublicMenuPage'; // Importando a nova página

function App() {
  return (
    <Router>
      <ToastProvider />
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          
          {/* Rota Pública do Cardápio */}
          <Route path="/menu/:restaurantId" element={<PublicMenuPage />} />

          {/* Rotas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<RestaurantArea />}>
              <Route index element={<RestaurantDashboard />} />
              <Route path="menu" element={<RestaurantMenu />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;