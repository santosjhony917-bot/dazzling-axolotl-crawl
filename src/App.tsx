import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/Index';
import LoginPage from './pages/Login';
import ProfilePage from './pages/profile/ProfilePage';
import ToastProvider from './components/ToastProvider';
import Layout from './components/layout/Layout';
import RestaurantDashboardPage from './pages/restaurant/RestaurantDashboardPage';
import RestaurantMenuPage from './pages/restaurant/RestaurantMenuPage';
import RestaurantGalleryPage from './pages/restaurant/RestaurantGalleryPage';
import RestaurantSettingsPage from './pages/restaurant/RestaurantSettingsPage';
import RestaurantPublicPage from './pages/RestaurantPublicPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';

function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<IndexPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantPublicPage />} />
          
          {/* Protected Routes (User) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Route>

          {/* Protected Routes (Restaurant Owner) */}
          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route index element={<RestaurantDashboardPage />} />
            <Route path="menu" element={<RestaurantMenuPage />} />
            <Route path="gallery" element={<RestaurantGalleryPage />} />
            <Route path="settings" element={<RestaurantSettingsPage />} />
          </Route>

          {/* Protected Routes (Admin) */}
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route index element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;