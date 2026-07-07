"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ToastProvider from '@/components/ToastProvider';

// Layouts
import SharedLayoutWrapper from '@/layouts/SharedLayoutWrapper'; // Import the wrapper

// Pages
import Index from '@/pages/Index'; // Redireciona para Splash
import Home from '@/pages/Home'; // Home do Cliente
import Onboarding from '@/pages/Onboarding';
import Welcome from '@/pages/Welcome';
import LandingPage from '@/pages/LandingPage';
import AuthComponent from '@/pages/Auth';
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import MenuItemDetails from '@/pages/MenuItemDetails';
import HelpCenter from '@/pages/HelpCenter';
import Legal from '@/pages/Legal';
import RestaurantResultsPage from '@/pages/RestaurantResults';
import ForgotPassword from '@/pages/ForgotPassword'; // Adicionado ForgotPassword
import PromoRedirect from '@/pages/PromoRedirect'; // ADICIONADO: Redirecionador do QR Code

// Client Pages
import ClientProfilePage from '@/pages/ClientProfilePage';
import FavoritesPage from '@/pages/Favorites';
import SearchUnifiedPage from '@/pages/SearchUnifiedPage';
import FullMenuPage from '@/pages/FullMenuPage'; // Importar o componente FullMenuPage
import FriendsPage from '@/pages/FriendsPage';
import HappyHourHub from '@/pages/HappyHourHub';
import HappyHourRoom from '@/pages/HappyHourRoom';
import ComboFinderPage from '@/pages/ComboFinderPage';

// Restaurant Area Pages
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import ProfileSettingsPage from '@/pages/restaurant/ProfileSettingsPage';
import MenuManagement from '@/pages/restaurant/MenuManagement'; // ADICIONADO
import GalleryManagement from '@/pages/restaurant/GalleryManagement';
import UpgradePage from '@/pages/Upgrade';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import CategoryDetails from '@/pages/restaurant/CategoryDetails';
import MetricsPage from '@/pages/restaurant/MetricsPage'; // Adicionado MetricsPage

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLogin from '@/pages/admin/AdminLogin';
import GoogleMapsCollector from '@/pages/admin/GoogleMapsCollector';
import AdminCrm from '@/pages/admin/AdminCrm';

// Novas Rotas de Expansão (City-Centric)
import ExpansionHub from '@/pages/admin/expansion/ExpansionHub';
import CityDashboard from '@/pages/admin/expansion/CityDashboard';

function App() {
  React.useEffect(() => {
    const syncListener = () => {
      localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
    };
    window.addEventListener('local-sync-restaurants', syncListener);
    return () => {
      window.removeEventListener('local-sync-restaurants', syncListener);
    };
  }, []);

  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<Index />} />
        <Route path="/c/:shortCode" element={<PromoRedirect />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/auth" element={<AuthComponent />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
        <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
        <Route path="/restaurant-results" element={<RestaurantResultsPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/restaurant/:restaurantId/menu" element={<FullMenuPage />} /> {/* Rota alternativa para o cardápio */}
        <Route path="/restaurant/:restaurantId/menu-full" element={<FullMenuPage />} /> {/* Rota para o cardápio completo */}

        {/* Rotas Públicas da Área do Restaurante (Hub e Login/Cadastro) */}
        <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
        <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
        <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
        <Route path="/restaurant-area/claim" element={<ClaimRestaurant />} />

        {/* Rotas Protegidas do Cliente (Usando SharedLayoutWrapper) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" element={<SharedLayoutWrapper />} />}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/search" element={<SearchUnifiedPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/happy-hours" element={<HappyHourHub />} />
          <Route path="/happy-hour/:id" element={<HappyHourRoom />} />
          <Route path="/combo-finder" element={<ComboFinderPage />} />
        </Route>

        {/* Rotas Protegidas da Área do Restaurante (Usando SharedLayoutWrapper e Proteção de Role) */}
        <Route element={<ProtectedRoute requiredRole="restaurant_owner" element={<SharedLayoutWrapper />} />}>
          <Route path="/restaurant-area/profile-menu" element={<ProfileSettingsPage />} />
          <Route path="/restaurant-area/menu" element={<MenuManagement />} />
          <Route path="/restaurant-area/menu/:categoryId" element={<CategoryDetails />} />
          <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
          <Route path="/restaurant-area/upgrade" element={<UpgradePage />} />
          <Route path="/restaurant-area/metrics" element={<MetricsPage />} />
        </Route>

        {/* Rotas Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/expansion" element={<ExpansionHub />} />
          <Route path="/admin/collector" element={<GoogleMapsCollector />} />
          <Route path="/admin/expansion/:cityId" element={<CityDashboard />} />
          <Route path="/admin/crm" element={<AdminCrm />} />
          <Route path="/admin/plans" element={<Navigate to="/admin/crm" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/admin/crm" replace />} />
        </Route>
        {/* Redirecionamento de Rotas Legadas da Área do Restaurante para as Rotas Unificadas */}
        <Route path="/restaurant-area/search" element={<Navigate to="/search" replace />} />
        <Route path="/restaurant-area/home" element={<Navigate to="/home" replace />} />
        <Route path="/restaurant-area/favorites" element={<Navigate to="/favorites" replace />} />

        {/* Fallback de Rota não Encontrada */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
