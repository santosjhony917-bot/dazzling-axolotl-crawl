import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContextProvider } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './layouts/Layout';
import { Loader2 } from 'lucide-react';

// Componente de Fallback para Suspense
const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Lazy Loaded Pages
const Splash = React.lazy(() => import('./pages/Splash'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Welcome = React.lazy(() => import('./pages/Welcome'));
const AuthPage = React.lazy(() => import('./pages/Auth'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Legal = React.lazy(() => import('./pages/Legal'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Home = React.lazy(() => import('./pages/Home'));
const ClientProfilePage = React.lazy(() => import('./pages/ClientProfilePage'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const SearchUnifiedPage = React.lazy(() => import('./pages/SearchUnifiedPage'));
const SearchRestaurants = React.lazy(() => import('./pages/SearchRestaurants'));
const RestaurantResultsPage = React.lazy(() => import('./pages/RestaurantResults'));
const RestaurantProfilePublic = React.lazy(() => import('./pages/RestaurantProfilePublic'));

// Restaurant Flow
const RestaurantAreaHub = React.lazy(() => import('./pages/RestaurantAreaHub'));
const RestaurantLogin = React.lazy(() => import('./pages/RestaurantLogin'));
const RestaurantSignup = React.lazy(() => import('./pages/RestaurantSignup'));
const ClaimRestaurant = React.lazy(() => import('./pages/ClaimRestaurant'));
const RestaurantDashboard = React.lazy(() => import('./pages/RestaurantDashboard'));
const RestaurantProfilePage = React.lazy(() => import('./pages/restaurant-area/Profile'));
const MenuManagement = React.lazy(() => import('./pages/restaurant/MenuManagement'));
const GalleryManagement = React.lazy(() => import('./pages/restaurant/GalleryManagement'));
const HelpCenter = React.lazy(() => import('./pages/restaurant/HelpCenter'));
const UpgradePage = React.lazy(() => import('./pages/Upgrade'));

// Admin Pages
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const ManageAdmins = React.lazy(() => import('./pages/admin/ManageAdmins'));
const AdminRestaurants = React.lazy(() => import('./pages/admin/AdminRestaurants'));
const AdminPlans = React.lazy(() => import('./pages/admin/AdminPlans'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const AdminUploadInfo = React.lazy(() => import('./pages/admin/AdminUploadInfo'));
const PopularCategories = React.lazy(() => import('./pages/admin/PopularCategories'));
const ImportMenu = React.lazy(() => import('./pages/admin/ImportMenu'));
const EditRestaurant = React.lazy(() => import('./pages/admin/EditRestaurant'));


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <Router>
          <Suspense fallback={<SuspenseFallback />}>
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
                  <Route path="/restaurant-area/profile-menu" element={<RestaurantProfilePage />} />
                  <Route path="/restaurant-area/menu" element={<MenuManagement />} />
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
          </Suspense>
        </Router>
        <Toaster />
      </AuthContextProvider>
    </QueryClientProvider>
  );
}

export default App;