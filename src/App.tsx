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
import RestaurantProfilePublic from './pages/RestaurantProfilePublic'; // Importando o componente correto
import SearchUnifiedPage from './pages/SearchUnifiedPage'; // Importando o componente correto
import MenuItemDetails from './pages/MenuItemDetails';
import HelpCenter from './pages/HelpCenter';
import Onboarding from './pages/Onboarding'; // Importando Onboarding
import Welcome from './pages/Welcome'; // Importando Welcome
import RestaurantAreaHub from './pages/RestaurantAreaHub'; // Importando RestaurantAreaHub

// Restaurant Area Pages
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import ProfileManagementLayout from './components/restaurant/ProfileManagementLayout';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import UpgradePage from './pages/Upgrade';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';

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
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
        <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
        <Route path="/help-center" element={<HelpCenter />} />
        
        {/* Rotas Públicas da Área do Restaurante (Hub e Login/Cadastro) */}
        <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
        <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
        <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
        <Route path="/restaurant-area/claim" element={<ClaimRestaurant />} />

        {/* Rotas Protegidas (Cliente) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" />}>
          <Route path="/home" element={<Index />} />
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/search-unified" element={<SearchUnifiedPage />} /> {/* USANDO O COMPONENTE CORRETO */}
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