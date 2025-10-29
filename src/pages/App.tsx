import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ToastProvider from '@/components/ToastProvider';

// Layouts
import ClientLayout from '@/layouts/ClientLayout';
import RestaurantOwnerLayout from '@/layouts/RestaurantOwnerLayout';
import AdminLayout from '@/components/admin/AdminLayout';

// Pages
import Index from '@/pages/Index'; // Redireciona para Splash
import Home from '@/pages/Home'; // Nova Home do Cliente
import Onboarding from '@/pages/Onboarding';
import Welcome from '@/pages/Welcome';
import AuthComponent from '@/pages/Auth';
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import MenuItemDetails from '@/pages/MenuItemDetails';
import HelpCenter from '@/pages/HelpCenter';
import Legal from '@/pages/Legal';
import RestaurantResultsPage from '@/pages/RestaurantResults';

// Client Pages
import ClientProfilePage from '@/pages/ClientProfilePage';
import FavoritesPage from '@/pages/Favorites';
import SearchUnifiedPage from '@/pages/SearchUnifiedPage';

// Restaurant Area Pages
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import RestaurantDashboard from '@/pages/restaurant/RestaurantDashboard';
import RestaurantProfileSettingsPage from '@/pages/restaurant/ProfileSettingsPage';
import MenuManagement from '@/pages/restaurant/MenuManagement';
import GalleryManagement from '@/pages/restaurant/GalleryManagement';
import UpgradePage from '@/pages/Upgrade';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import CategoryDetails from '@/pages/restaurant/CategoryDetails';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminRestaurants from '@/pages/admin/AdminRestaurants';
import ManageAdmins from '@/pages/admin/ManageAdmins';
import PopularCategories from '@/pages/admin/PopularCategories';
import Files from '@/pages/admin/Files';
import ImportMenu from '@/pages/admin/ImportMenu';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminPlans from '@/pages/admin/AdminPlans';

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

        {/* Rotas Públicas da Área do Restaurante (Hub e Login/Cadastro) */}
        <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
        <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
        <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
        <Route path="/restaurant-area/claim" element={<ClaimRestaurant />} />

        {/* Rotas Protegidas do Cliente (Usando ClientLayout) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" element={<ClientLayout />} />}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<ClientProfilePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/search-unified" element={<SearchUnifiedPage />} />
        </Route>

        {/* Rotas Protegidas da Área do Restaurante (Usando RestaurantOwnerLayout) */}
        <Route element={<ProtectedRoute requiredRole="restaurant_owner" element={<RestaurantOwnerLayout />} />}>
          <Route path="/restaurant-area/home" element={<RestaurantDashboard />} />
          <Route path="/restaurant-area/profile-menu" element={<RestaurantProfileSettingsPage />} />
          <Route path="/restaurant-area/menu" element={<MenuManagement />} />
          <Route path="/restaurant-area/menu/:categoryId" element={<CategoryDetails />} />
          <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
          <Route path="/restaurant-area/upgrade" element={<UpgradePage />} />
        </Route>

        {/* Rotas Protegidas do Admin (Usando AdminLayout) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/restaurants" element={<AdminRestaurants />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/users" element={<ManageAdmins />} />
          <Route path="/admin/categories" element={<PopularCategories />} />
          <Route path="/admin/files" element={<Files />} />
          <Route path="/admin/import" element={<ImportMenu />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
        
      </Routes>
    </Router>
  );
}

export default App;