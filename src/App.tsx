import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/ToastProvider';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import RestaurantResults from './pages/RestaurantResults';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminPlans from './pages/admin/AdminPlans';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import Legal from './pages/Legal';
import ForgotPassword from './pages/ForgotPassword';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import ClientSearchPage from './pages/ClientSearchPage';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantArea from './pages/RestaurantArea';
import Upgrade from './pages/Upgrade';
import HelpCenter from './pages/restaurant/HelpCenter';
import RestaurantHome from './pages/RestaurantHome';
import RestaurantProfilePage from './pages/restaurant-area/Profile';
import RestaurantMenu from './pages/RestaurantMenu';
import RestaurantCategories from './pages/RestaurantCategories';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import RestaurantSearch from './pages/restaurant/RestaurantSearch';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Splash from './pages/Splash'; // Importando Splash
import RestaurantDashboard from './pages/RestaurantDashboard'; // Importando o Dashboard completo

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider />
        <Routes>
          {/* Public/Customer Flow Routes */}
          <Route path="/" element={<Splash />} /> {/* Rota raiz agora é Splash */}
          <Route path="/home" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/search-client" element={<ClientSearchPage />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/results" element={<RestaurantResults />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />

          {/* Restaurant Owner Entry Points */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          
          {/* Restaurant Owner Area (Protected by AuthContext logic) */}
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route path="home" element={<RestaurantDashboard />} /> {/* USANDO DASHBOARD COMPLETO */}
            <Route path="stats" element={<RestaurantSearch />} /> {/* Using RestaurantSearch for stats/search */}
            <Route path="profile-menu" element={<RestaurantProfilePage />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="gallery" element={<GalleryManagement />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="help" element={<HelpCenter />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="restaurants" element={<AdminRestaurants />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;