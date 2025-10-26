import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ClientLayout from './components/ClientLayout';
import RestaurantLayout from './components/restaurant/RestaurantLayout';
import AdminLayout from './components/admin/AdminLayout';
import ToastProvider from './components/ToastProvider';

// Pages
import Index from './pages/Index';
import AuthPage from './pages/AuthPage';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import RestaurantProfile from './pages/RestaurantProfile';
import SearchUnified from './pages/SearchUnified';
import MenuItemDetails from './pages/MenuItemDetails';
import HelpCenter from './pages/HelpCenter'; // Importando a nova página

// Restaurant Area Pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import ProfileManagementLayout from './components/restaurant/ProfileManagementLayout';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import UpgradePage from './pages/Upgrade';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';

function App() {
  return (
    <Router>
      <ToastProvider />
      <AuthProvider>
        <Routes>
          {/* Rotas Públicas/Gerais */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantProfile />} />
          <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
          <Route path="/help-center" element={<HelpCenter />} /> {/* Rota da Central de Ajuda */}

          {/* Rotas Protegidas (Cliente) */}
          <Route element={<ProtectedRoute requiredRole="authenticated" element={<ClientLayout />} />}>
            <Route path="/home" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/search-unified" element={<SearchUnified />} />
          </Route>

          {/* Rotas Protegidas (Área do Restaurante) */}
          <Route element={<ProtectedRoute requiredRole="restaurant_owner" element={<RestaurantLayout />} />}>
            <Route path="/restaurant-area/home" element={<RestaurantDashboard />} />
            <Route path="/restaurant-area/profile-menu" element={<ProfileManagementLayout />} />
            <Route path="/restaurant-area/menu" element={<MenuManagement />} />
            <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
            <Route path="/restaurant-area/upgrade" element={<UpgradePage />} />
          </Route>

          {/* Rotas Protegidas (Admin) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;