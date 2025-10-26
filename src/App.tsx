import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ToastProvider from './components/ToastProvider';

// Pages
import Index from './pages/Index'; // Nova Home do Cliente
import Splash from './pages/Splash'; // Importando Splash
import AuthPage from './pages/AuthPage';
import ClientProfilePage from './pages/ClientProfilePage';
import Favorites from './pages/Favorites';
import RestaurantProfile from './pages/RestaurantProfile';
import SearchUnified from './pages/SearchUnified';
import MenuItemDetails from './pages/MenuItemDetails';
import HelpCenter from './pages/HelpCenter';

// Restaurant Area Pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import ProfileManagementLayout from './components/restaurant/ProfileManagementLayout';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import UpgradePage from './pages/Upgrade';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';

function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<Splash />} /> {/* Rota raiz agora é Splash */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfile />} />
        <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
        <Route path="/help-center" element={<HelpCenter />} />

        {/* Rotas Protegidas (Cliente) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" />}>
          <Route path="/home" element={<Index />} /> {/* /home agora usa Index.tsx (ClientHome) */}
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/search-unified" element={<SearchUnified />} />
        </Route>

        {/* Rotas Protegidas (Área do Restaurante) */}
        <Route element={<ProtectedRoute requiredRole="restaurant_owner" />}>
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
    </Router>
  );
}

export default App;