"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SharedLayoutWrapper from './layouts/SharedLayoutWrapper';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import AuthPage from './pages/Auth';
import Splash from './pages/Splash';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import MenuItemDetails from './pages/MenuItemDetails';
import RestaurantResults from './pages/RestaurantResults';
import ClientProfilePage from './pages/ClientProfilePage';
import Favorites from './pages/Favorites';
import ClaimRestaurant from './pages/ClaimRestaurant';
import FullMenuPage from './pages/FullMenuPage';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantDashboardPage from './pages/restaurant/RestaurantDashboardPage';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import ProfileSettingsPage from './pages/restaurant/ProfileSettingsPage';
import MetricsPage from './pages/restaurant/MetricsPage';
import CategoryDetails from './pages/restaurant/CategoryDetails';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPlans from './pages/admin/ManagePlans';
import AdminBanners from './pages/admin/AdminBanners';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLogin from './pages/admin/AdminLogin';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster'; // Importando Toaster do shadcn/ui
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Rota de Splash Screen */}
            <Route path="/splash" element={<Splash />} />

            {/* Rotas Públicas (sem autenticação necessária) */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<SharedLayoutWrapper />}>
              <Route index element={<Home />} />
              <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
              <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
              <Route path="/restaurant-results" element={<RestaurantResults />} />
              <Route path="/restaurant/:restaurantId/menu-full" element={<FullMenuPage />} />
            </Route>

            {/* Rotas Protegidas do Cliente (Usando SharedLayoutWrapper) */}
            <Route element={<ProtectedRoute requiredRole="user" element={<SharedLayoutWrapper />} />}> {/* Corrigido para 'user' */}
              <Route path="/profile" element={<ClientProfilePage />} />
              <Route path="/favorites" element={<Favorites />} />
            </Route>

            {/* Rotas Protegidas da Área do Restaurante (Usando SharedLayoutWrapper e Proteção de Role) */}
            <Route element={<ProtectedRoute requiredRole="restaurant" element={<SharedLayoutWrapper />} />}> {/* Corrigido para 'restaurant' */}
              <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
              <Route path="/restaurant-area" element={<RestaurantAreaHub />}>
                <Route path="home" element={<RestaurantDashboardPage />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="menu/:categoryId" element={<CategoryDetails />} />
                <Route path="gallery" element={<GalleryManagement />} />
                <Route path="profile-menu" element={<ProfileSettingsPage />} />
                <Route path="metrics" element={<MetricsPage />} />
              </Route>
            </Route>

            {/* Rotas Protegidas do Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/restaurants" element={<AdminRestaurants />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
      <Toaster /> {/* Adicionando o Toaster aqui */}
    </QueryClientProvider>
  );
}

export default App;