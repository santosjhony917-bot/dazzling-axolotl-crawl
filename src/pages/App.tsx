import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import ToastProvider from '../components/ToastProvider';

// Pages
import Index from './Index'; // Redireciona para Splash
import Home from './Home'; // Nova Home do Cliente
import Splash from './Splash';
import AuthComponent from './Auth'; // Importando o componente customizado
import ClientProfilePage from './ClientProfilePage';
import FavoritesPage from './Favorites'; // Importando a nova página de favoritos
import RestaurantProfilePublic from './RestaurantProfilePublic';
import SearchUnifiedPage from './SearchUnifiedPage';
import MenuItemDetails from './MenuItemDetails';
import HelpCenter from './HelpCenter';
import Onboarding from './Onboarding';
import Welcome from './Welcome';
import RestaurantAreaHub from './RestaurantAreaHub';

// Restaurant Area Pages
import RestaurantDashboard from './restaurant/RestaurantDashboard';
import ProfileManagementLayout from '../components/restaurant/ProfileManagementLayout';
import MenuManagement from './restaurant/MenuManagement';
import GalleryManagement from './restaurant/GalleryManagement';
import UpgradePage from './Upgrade';
import RestaurantLogin from './RestaurantLogin';
import RestaurantSignup from './RestaurantSignup';
import ClaimRestaurant from './ClaimRestaurant';

// Admin Pages
import AdminDashboard from './admin/AdminDashboard';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from '../components/admin/AdminLayout';

function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<Index />} /> {/* Redireciona para Onboarding */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/auth" element={<AuthComponent />} />
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
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/search-unified" element={<SearchUnifiedPage />} />
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