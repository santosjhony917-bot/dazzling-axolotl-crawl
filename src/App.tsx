"use client";

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import ToastProvider from '@/components/ToastProvider';

const SharedLayoutWrapper = React.lazy(() => import('@/layouts/SharedLayoutWrapper'));
const Home = React.lazy(() => import('@/pages/Home'));
const Onboarding = React.lazy(() => import('@/pages/Onboarding'));
const Welcome = React.lazy(() => import('@/pages/Welcome'));
const LandingPage = React.lazy(() => import('@/pages/LandingPage'));
const AuthComponent = React.lazy(() => import('@/pages/Auth'));
const RestaurantProfilePublic = React.lazy(() => import('@/pages/RestaurantProfilePublic'));
const MenuItemDetails = React.lazy(() => import('@/pages/MenuItemDetails'));
const HelpCenter = React.lazy(() => import('@/pages/HelpCenter'));
const Legal = React.lazy(() => import('@/pages/Legal'));
const RestaurantResultsPage = React.lazy(() => import('@/pages/RestaurantResults'));
const ForgotPassword = React.lazy(() => import('@/pages/ForgotPassword'));
const PromoRedirect = React.lazy(() => import('@/pages/PromoRedirect'));
const ClientProfilePage = React.lazy(() => import('@/pages/ClientProfilePage'));
const FavoritesPage = React.lazy(() => import('@/pages/Favorites'));
const SearchUnifiedPage = React.lazy(() => import('@/pages/SearchUnifiedPage'));
const FullMenuPage = React.lazy(() => import('@/pages/FullMenuPage'));
const FriendsPage = React.lazy(() => import('@/pages/FriendsPage'));
const HappyHourHub = React.lazy(() => import('@/pages/HappyHourHub'));
const HappyHourRoom = React.lazy(() => import('@/pages/HappyHourRoom'));
const RestaurantAreaHub = React.lazy(() => import('@/pages/RestaurantAreaHub'));
const ProfileSettingsPage = React.lazy(() => import('@/pages/restaurant/ProfileSettingsPage'));
const MenuManagement = React.lazy(() => import('@/pages/restaurant/MenuManagement'));
const GalleryManagement = React.lazy(() => import('@/pages/restaurant/GalleryManagement'));
const UpgradePage = React.lazy(() => import('@/pages/Upgrade'));
const RestaurantLogin = React.lazy(() => import('@/pages/RestaurantLogin'));
const RestaurantSignup = React.lazy(() => import('@/pages/RestaurantSignup'));
const ClaimRestaurant = React.lazy(() => import('@/pages/ClaimRestaurant'));
const CategoryDetails = React.lazy(() => import('@/pages/restaurant/CategoryDetails'));
const MetricsPage = React.lazy(() => import('@/pages/restaurant/MetricsPage'));
const AdminLayout = React.lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminLogin = React.lazy(() => import('@/pages/admin/AdminLogin'));
const GoogleMapsCollector = React.lazy(() => import('@/pages/admin/GoogleMapsCollector'));
const AdminCrm = React.lazy(() => import('@/pages/admin/AdminCrm'));
const ExpansionHub = React.lazy(() => import('@/pages/admin/expansion/ExpansionHub'));
const CityDashboard = React.lazy(() => import('@/pages/admin/expansion/CityDashboard'));

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--ff-background)] font-['Poppins'] text-[var(--ff-text-primary)]" role="status" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-[var(--ff-primary)]/25 border-t-[var(--ff-primary)]" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold">Carregando experiência...</p>
      </div>
    </div>
  );
}

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
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Rotas Públicas/Gerais */}
        <Route path="/" element={<LandingPage />} />
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
          <Route path="/combo-finder" element={<Navigate to="/home?assistant=1" replace />} />
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
      </Suspense>
    </Router>
  );
}

export default App;
