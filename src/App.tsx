import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SharedLayoutWrapper from './layouts/SharedLayoutWrapper';
import IndexPage from './pages/Index';
import SearchPage from './pages/Search';
import FavoritesPage from './pages/Favorites';
import ProfilePage from './pages/Profile';
import RestaurantProfilePage from './pages/RestaurantProfile';
import MenuItemDetailsPage from './pages/MenuItemDetails';
import Login from './pages/Login';
import { AuthProvider } from './integrations/supabase/auth';
import RestaurantManagementLayout from './layouts/RestaurantManagementLayout';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import RestaurantProfileManagement from './pages/restaurant/RestaurantProfileManagement';
import MenuManagement from './pages/restaurant/MenuManagement';
import MetricsManagement from './pages/restaurant/MetricsManagement';
import ClientProfilePage from './pages/ClientProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rotas Públicas e de Cliente */}
          <Route path="/" element={<SharedLayoutWrapper />}>
            <Route index element={<IndexPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="favorites" element={<ProtectedRoute element={<FavoritesPage />} />} />
            <Route path="profile" element={<ProtectedRoute element={<ClientProfilePage />} />} />
            <Route path="restaurant/:restaurantId" element={<RestaurantProfilePage />} />
            <Route path="menu-item/:itemId" element={<MenuItemDetailsPage />} />
          </Route>

          {/* Rotas de Autenticação */}
          <Route path="/login" element={<Login />} />

          {/* Rotas de Gerenciamento de Restaurante (Protegidas) */}
          <Route path="/restaurant-management/:restaurantId" element={<ProtectedRoute element={<RestaurantManagementLayout />} />}>
            <Route index element={<RestaurantDashboard />} />
            <Route path="profile" element={<RestaurantProfileManagement />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="metrics" element={<MetricsManagement />} />
          </Route>
          
          {/* Rota de fallback para 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;