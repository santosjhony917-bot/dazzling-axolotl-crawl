"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ToastProvider from '@/components/ToastProvider';

// Layouts
import SharedLayoutWrapper from '@/layouts/SharedLayoutWrapper'; // Import the wrapper

// Pages
import Index from '@/pages/Index'; // Redireciona para Splash
import Home from '@/pages/Home'; // Home do Cliente
import Onboarding from '@/pages/Onboarding';
import Welcome from '@/pages/Welcome';
import AuthComponent from '@/pages/Auth';
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import MenuItemDetails from '@/pages/MenuItemDetails';
import HelpCenter from '@/pages/HelpCenter';
import Legal from '@/pages/Legal';
import RestaurantResultsPage from '@/pages/RestaurantResults';
import ForgotPassword from '@/pages/ForgotPassword'; // Adicionado ForgotPassword
import FullMenuPage from '@/pages/FullMenuPage'; // Adicionado FullMenuPage

// Client Pages
import ClientProfilePage from '@/pages/ClientProfilePage';
import FavoritesPage from '@/pages/Favorites';
import SearchUnifiedPage from '@/pages/SearchUnifiedPage'; // Componente de busca

// Restaurant Area Pages
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import ProfileSettingsPage from '@/pages/restaurant/ProfileSettingsPage';
import MenuManagement from '@/pages/restaurant/MenuManagement';
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
import AdminRestaurants from '@/pages/admin/AdminRestaurants';
import AdminEditRestaurant from '@/pages/admin/AdminEditRestaurant';
import ManageAdmins from '@/pages/admin/ManageAdmins';
import PopularCategories from '@/pages/admin/PopularCategories';
import Files from '@/pages/admin/Files';
import ImportMenu from '@/pages/admin/ImportMenu';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminPlans from '@/pages/admin/AdminPlans';
import AdminBanners from '@/pages/admin/AdminBanners';
import AdminRestaurantMenu from '@/pages/admin/AdminRestaurantMenu'; // Importação adicionada

function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<Index />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/auth" element={<AuthComponent />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
        <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
        <Route path="/restaurant-results" element={<RestaurantResultsPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/restaurant/:restaurantId/menu-full" element={<FullMenuPage />} />

        {/* Rotas Públicas da Área do Restaurante (Hub e Login/Cadastro) */}
        <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
        <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
        <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
        <Route path="/restaurant-area/claim" element={<ClaimRestaurant />} />

        {/* Rotas Protegidas da Área do Restaurante (Usando SharedLayoutWrapper e Proteção de Role) */}
        {/* Colocadas antes das rotas de cliente para evitar conflitos de path como /search ou /favorites */}
        <Route element={<ProtectedRoute requiredRole="restaurant_owner" element={<SharedLayoutWrapper />} />}>
          {/* O Home do Restaurante Free é a página Home do Cliente */}
          <Route path="/restaurant-area/home" element={<Home />} /> 
          <Route path="/restaurant-area/profile-menu" element={<ProfileSettingsPage />} />
          <Route path="/restaurant-area/menu" element={<MenuManagement />} />
          <Route path="/restaurant-area/menu/:categoryId" element={<CategoryDetails />} />
          <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
          <Route path="/restaurant-area/upgrade" element={<UpgradePage />} />
          <Route path="/restaurant-area/metrics" element={<MetricsPage />} />
          <Route path="/restaurant-area/search" element={<SearchUnifiedPage />} />
          <Route path="/restaurant-area/favorites" element={<FavoritesPage />} />
        </Route>

        {/* Rotas Protegidas do Cliente (Usando SharedLayoutWrapper) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" element={<SharedLayoutWrapper />} />}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/search" element={<SearchUnifiedPage />} />
        </Route>

        {/* Rotas Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/restaurants" element={<AdminRestaurants />} />
          <Route path="/admin/restaurants/:restaurantId" element={<AdminEditRestaurant />} />
          <Route path="/admin/restaurants/:restaurantId/menu" element={<AdminRestaurantMenu />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/users" element={<ManageAdmins />} />
          <Route path="/admin/categories" element={<PopularCategories />} />
          <Route path="/admin/files" element={<Files />} />
          <Route path="/admin/import" element={<ImportMenu />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
        </Route>
        
      </Routes>
    </Router>
  );
}

export default App;