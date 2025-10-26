import React from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContextProvider } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';

// Pages
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import AuthPage from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import Home from './pages/Home';
import ClientProfilePage from './pages/ClientProfilePage';
import Favorites from './pages/Favorites';
import SearchUnifiedPage from './pages/SearchUnifiedPage';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantResultsPage from './pages/RestaurantResults';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';

// Restaurant Area Pages
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import RestaurantDashboard from './pages/RestaurantDashboard';
import ProfileManagementLayout from './components/restaurant/ProfileManagementLayout';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import HelpCenter from './pages/restaurant/HelpCenter';
import UpgradePage from './pages/Upgrade';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAdmins from './pages/admin/ManageAdmins';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminPlans from './pages/admin/AdminPlans';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminUploadInfo from './pages/admin/AdminUploadInfo';
import PopularCategories from './pages/admin/PopularCategories';
import ImportMenu from './pages/admin/ImportMenu';
import EditRestaurant from './pages/admin/EditRestaurant';


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <Router>
          <RouterRoutes>
            {/* Public Routes */}
            <Route path="/" element={<Splash />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/legal" element={<Legal />} />
            
            {/* Public Restaurant Profile */}
            <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
            <Route path="/results" element={<RestaurantResultsPage />} />
            
            {/* Restaurant Flow (Unauthenticated Entry Points) */}
            <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
            <Route path="/restaurant-login" element={<RestaurantLogin />} />
            <Route path="/restaurant-signup" element={<RestaurantSignup />} />
            <Route path="/claim-restaurant" element={<ClaimRestaurant />} />

            {/* Protected Routes (Authenticated User) */}
            <Route element={<ProtectedRoute requiredRole="authenticated" />}>
              <Route element={<Layout />}>
                {/* Customer Routes */}
                <Route path="/home" element={<Home />} />
                <Route path="/profile" element={<ClientProfilePage />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/search-unified" element={<SearchUnifiedPage />} />
                <Route path="/search-restaurants" element={<SearchRestaurants />} />
                
                {/* Restaurant Owner Routes (Protected by role check inside ProtectedRoute) */}
                <Route path="/restaurant-area/home" element={<RestaurantDashboard />} />
                <Route path="/restaurant-area/profile-menu" element={<ProfileManagementLayout />} />
                <Route path="/restaurant-area/menu" element={<MenuManagement />} />
                {/* Rota de detalhes de categoria removida: <Route path="/restaurant-area/menu/:categoryId" element={<CategoryDetails />} /> */}
                <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
                <Route path="/restaurant-area/help" element={<HelpCenter />} />
                <Route path="/restaurant-area/upgrade" element={<UpgradePage />} />
              </Route>
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/manage-admins" element={<ManageAdmins />} />
              <Route path="/admin/restaurants" element={<AdminRestaurants />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/upload" element={<AdminUploadInfo />} />
              <Route path="/admin/popular-categories" element={<PopularCategories />} />
              <Route path="/admin/import" element={<ImportMenu />} />
              <Route path="/admin/edit-restaurant" element={<EditRestaurant />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Router>
        <Toaster />
      </AuthContextProvider>
    </QueryClientProvider>
  );
}

export default App;