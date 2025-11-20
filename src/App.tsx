"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

// Client Pages
import ClientProfilePage from '@/pages/ClientProfilePage';
import FavoritesPage from '@/pages/Favorites';
import SearchUnifiedPage from '@/pages/SearchUnifiedPage';
import FullMenuPage from '@/pages/FullMenuPage'; // Importar o componente FullMenuPage

// Restaurant Area Pages
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import ProfileSettingsPage from '@/pages/Restaurant/ProfileSettingsPage';
import MenuManagement from '@/pages/Restaurant/MenuManagement'; // ADICIONADO
import GalleryManagement from '@/pages/Restaurant/GalleryManagement';
import UpgradePage from '@/pages/Upgrade';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import CategoryDetails from '@/pages/Restaurant/CategoryDetails';
import MetricsPage from '@/pages/Restaurant/MetricsPage'; // Adicionado MetricsPage
import SearchRestaurants from '@/pages/SearchRestaurants';
import RestaurantDashboard from '@/pages/RestaurantDashboard';

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminRestaurants from '@/pages/admin/AdminRestaurants';
import ManageAdmins from '@/pages/admin/ManageAdmins';
import PopularCategories from '@/pages/admin/PopularCategories';
import Files from '@/pages/admin/Files';
import ImportMenu from '@/pages/admin/ImportMenu';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminPlans from '@/pages/admin/AdminPlans';
import AdminEditRestaurant from '@/pages/admin/AdminEditRestaurant'; // Importar o novo componente
import AdminRestaurantMenu from '@/pages/admin/AdminRestaurantMenu'; // Importar o novo componente
import AdminBanners from '@/pages/admin/AdminBanners'; // Importar AdminBanners

// Animated page wrapper component
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};

// AnimatedRoutes component that uses useLocation
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route path="/welcome" element={<PageTransition><Welcome /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><AuthComponent /></PageTransition>} />
        <Route path="/legal" element={<PageTransition><Legal /></PageTransition>} />
        <Route path="/help-center" element={<PageTransition><HelpCenter /></PageTransition>} />
        <Route path="/restaurant/:restaurantId" element={<PageTransition><RestaurantProfilePublic /></PageTransition>} />
        <Route path="/menu-item/:itemId" element={<PageTransition><MenuItemDetails /></PageTransition>} />
        <Route path="/restaurant-results" element={<PageTransition><RestaurantResultsPage /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/restaurant/:restaurantId/menu-full" element={<PageTransition><FullMenuPage /></PageTransition>} /> {/* Rota para o cardápio completo */}

        {/* Rotas Públicas da Área do Restaurante (Hub e Login/Cadastro) */}
        <Route path="/restaurant-area-hub" element={<PageTransition><RestaurantAreaHub /></PageTransition>} />
        <Route path="/restaurant-area/login" element={<PageTransition><RestaurantLogin /></PageTransition>} />
        <Route path="/restaurant-area/signup" element={<PageTransition><RestaurantSignup /></PageTransition>} />
        <Route path="/restaurant-area/claim" element={<PageTransition><ClaimRestaurant /></PageTransition>} />

        {/* Rotas Protegidas do Cliente (Usando SharedLayoutWrapper) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" element={<SharedLayoutWrapper />} />}>
          <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ClientProfilePage /></PageTransition>} />
          <Route path="/favorites" element={<PageTransition><FavoritesPage /></PageTransition>} />
          <Route path="/search" element={<PageTransition><SearchUnifiedPage /></PageTransition>} />
        </Route>

        {/* Rotas Protegidas da Área do Restaurante (Usando SharedLayoutWrapper e Proteção de Role) */}
        <Route element={<ProtectedRoute requiredRole="restaurant_owner" element={<SharedLayoutWrapper />} />}>
          {/* O Home do Restaurante Free é a página Home do Cliente */}
          <Route path="/restaurant-area/home" element={<PageTransition><RestaurantDashboard /></PageTransition>} />
          <Route path="/restaurant-area/profile-menu" element={<PageTransition><ProfileSettingsPage /></PageTransition>} />
          <Route path="/restaurant-area/menu" element={<PageTransition><MenuManagement /></PageTransition>} />
          <Route path="/restaurant-area/menu/:categoryId" element={<PageTransition><CategoryDetails /></PageTransition>} />
          <Route path="/restaurant-area/gallery" element={<PageTransition><GalleryManagement /></PageTransition>} />
          <Route path="/restaurant-area/upgrade" element={<PageTransition><UpgradePage /></PageTransition>} />
          <Route path="/restaurant-area/metrics" element={<PageTransition><MetricsPage /></PageTransition>} />
          <Route path="/restaurant-area/search" element={<PageTransition><SearchUnifiedPage /></PageTransition>} />
          <Route path="/restaurant-area/favorites" element={<PageTransition><FavoritesPage /></PageTransition>} />
        </Route>

        {/* Rotas Admin */}
        <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
        <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
          <Route path="/admin/dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
          <Route path="/admin/restaurants" element={<PageTransition><AdminRestaurants /></PageTransition>} />
          <Route path="/admin/restaurants/:restaurantId" element={<PageTransition><AdminEditRestaurant /></PageTransition>} />
          <Route path="/admin/restaurants/:restaurantId/menu" element={<PageTransition><AdminRestaurantMenu /></PageTransition>} />
          <Route path="/admin/plans" element={<PageTransition><AdminPlans /></PageTransition>} />
          <Route path="/admin/users" element={<PageTransition><ManageAdmins /></PageTransition>} />
          <Route path="/admin/categories" element={<PageTransition><PopularCategories /></PageTransition>} />
          <Route path="/admin/files" element={<PageTransition><Files /></PageTransition>} />
          <Route path="/admin/import" element={<PageTransition><ImportMenu /></PageTransition>} />
          <Route path="/admin/settings" element={<PageTransition><AdminSettings /></PageTransition>} />
          <Route path="/admin/banners" element={<PageTransition><AdminBanners /></PageTransition>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <ToastProvider />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;