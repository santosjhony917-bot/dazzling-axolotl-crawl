import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ToastProvider from '@/components/ToastProvider';

// Pages
import Index from '@/pages/Index'; // Redireciona para Splash
import Home from '@/pages/Home'; // Nova Home do Cliente
import Splash from '@/pages/Splash';
import AuthComponent from '@/pages/Auth'; // Importando o componente customizado
import ClientProfilePage from '@/pages/ClientProfilePage';
import FavoritesPage from '@/pages/Favorites'; // Importando a nova página de favoritos
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import SearchUnifiedPage from '@/pages/SearchUnifiedPage';
import MenuItemDetails from '@/pages/MenuItemDetails';
import HelpCenter from '@/pages/HelpCenter';
import Onboarding from '@/pages/Onboarding';
import Welcome from '@/pages/Welcome';
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import ForgotPassword from '@/pages/ForgotPassword'; // Importação adicionada
import Legal from '@/pages/Legal'; // Importação adicionada
import RestaurantResultsPage from '@/pages/RestaurantResults'; // Importação adicionada

// Restaurant Area Pages
import RestaurantDashboard from '@/pages/restaurant/RestaurantDashboard';
import ProfileManagementLayout from '@/components/restaurant/ProfileManagementLayout';
import MenuManagement from '@/pages/restaurant/MenuManagement';
import GalleryManagement from '@/pages/restaurant/GalleryManagement';
import UpgradePage from '@/pages/Upgrade';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import CategoryDetails from '@/pages/restaurant/CategoryDetails'; // Importando CategoryDetails

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/components/admin/AdminLayout';
import ManagePlans from '@/pages/admin/ManagePlans';
import ManageAdmins from '@/pages/admin/ManageAdmins';
import AdminRestaurants from '@/pages/admin/AdminRestaurants';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminTransactions from '@/pages/admin/AdminTransactions';


function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<Index />} /> {/* Rota principal que renderiza Splash */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/auth" element={<AuthComponent />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
        <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/restaurant-results" element={<RestaurantResultsPage />} />
        
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
          <Route path="/restaurant-area/menu/:categoryId" element={<CategoryDetails />} />
          <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
          <Route path="/restaurant-area/upgrade" element={<UpgradePage />} />
        </Route>

        {/* Rotas Protegidas (Admin) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/plans" element={<ManagePlans />} />
          <Route path="/admin/manage-admins" element={<ManageAdmins />} />
          <Route path="/admin/restaurants" element={<AdminRestaurants />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
        
      </Routes>
    </Router>
  );
}

export default App;