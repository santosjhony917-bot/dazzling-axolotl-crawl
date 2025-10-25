import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ToastProvider from './components/ToastProvider';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import RestaurantResults from './pages/RestaurantResults';
import RestaurantDashboard from './pages/restaurant-area/Dashboard';
import RestaurantProfilePage from './pages/restaurant-area/Profile';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import RestaurantMenu from './pages/RestaurantMenu';
import RestaurantProfileMenu from './pages/RestaurantProfileMenu';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminPlans from './pages/admin/AdminPlans';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider />
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
            <Route path="/results" element={<RestaurantResults />} />

            {/* Authenticated User Routes */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />

            {/* Restaurant Owner Routes */}
            <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />
            <Route path="/restaurant/profile" element={<RestaurantProfilePage />} />
            <Route path="/restaurant/gallery" element={<GalleryManagement />} />
            <Route path="/restaurant/menu" element={<RestaurantMenu />} />
            <Route path="/restaurant/menu-profile" element={<RestaurantProfileMenu />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}> {/* FIX: Removed title prop */}
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="restaurants" element={<AdminRestaurants />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;