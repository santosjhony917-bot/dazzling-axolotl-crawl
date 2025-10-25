import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Home from './pages/Home';
import Welcome from './pages/Welcome';
import Onboarding from './pages/Onboarding';
import ForgotPassword from './pages/ForgotPassword';
import AuthPage from './pages/Auth';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboardPage from './pages/RestaurantDashboard';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import SearchRestaurants from './pages/SearchRestaurants';
import ClientSearchPage from './pages/ClientSearchPage';
import RestaurantResultsPage from './pages/RestaurantResults';
import FavoritesPage from './pages/Favorites';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminPlans from './pages/admin/AdminPlans';
import ManageAdmins from './pages/admin/ManageAdmins';
import AdminSettings from './pages/admin/AdminSettings';
import ImportMenu from './pages/admin/ImportMenu';
import Files from './pages/admin/Files';
import PopularCategories from './pages/admin/PopularCategories';
import RestaurantProfileMenu from './pages/restaurant-area/Profile';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import HelpCenter from './pages/restaurant/HelpCenter';
import UpgradePage from './pages/Upgrade';
import RestaurantMenuManagement from './pages/restaurant/MenuManagement';
import RestaurantCategoriesManagement from './pages/restaurant/CategoryManagement';
import Splash from './pages/Splash';
import RestaurantSearch from './pages/restaurant/Search'; // Importando a tela correta de busca/análise

function App() {
  return (
    <BrowserRouter>
      <ToastProvider />
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Splash />} /> {/* CORRIGIDO: Rota raiz para Splash */}
          <Route path="/index" element={<Index />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResultsPage />} />
          
          {/* Restaurant Flow Routes */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="restaurants" element={<AdminRestaurants />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="manage-admins" element={<ManageAdmins />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="import" element={<ImportMenu />} />
            <Route path="files" element={<Files />} />
            <Route path="popular-categories" element={<PopularCategories />} />
            <Route path="edit-restaurant" element={<AdminRestaurants />} />
          </Route>

          {/* Protected Customer Routes */}
          <Route element={<ProtectedRoute requiredRole="authenticated" />}>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/search-client" element={<ClientSearchPage />} />
          </Route>
          
          {/* Protected Restaurant Area Routes */}
          <Route path="/restaurant-area" element={<ProtectedRoute requiredRole="restaurant_owner" element={<RestaurantArea />} />}>
            <Route path="home" element={<RestaurantDashboardPage />} />
            <Route path="stats" element={<RestaurantSearch />} 
            />
            <Route path="profile-menu" element={<RestaurantProfileMenu />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="gallery" element={<GalleryManagement />} />
            <Route path="help" element={<HelpCenter />} />
            <Route path="menu" element={<RestaurantMenuManagement />} />
            <Route path="categories" element={<RestaurantCategoriesManagement />} />
          </Route>

          {/* Catch all - 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;