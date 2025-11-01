import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/Index';
import LoginPage from './pages/Auth';
import ProfilePage from './pages/profile/ProfilePage';
import ToastProvider from './components/ToastProvider';
import Layout from './layouts/Layout';
import RestaurantHomePage from './pages/restaurant/RestaurantHomePage';
import MenuManagementPage from './pages/restaurant/MenuManagement';
import GalleryManagementPage from './pages/restaurant/GalleryManagementPage';
import ProfileSettingsPage from './pages/restaurant/ProfileSettingsPage';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import SearchUnifiedPage from './pages/SearchUnifiedPage';
import Favorites from './pages/Favorites';

function App() {
  return (
    <Router>
      <ToastProvider />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<IndexPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/search" element={<SearchUnifiedPage />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
          
          {/* Protected Routes (User) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/favorites" element={<Favorites />} />
          </Route>

          {/* Protected Routes (Restaurant Owner) */}
          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route index element={<RestaurantHomePage />} />
            <Route path="menu" element={<MenuManagementPage />} />
            <Route path="gallery" element={<GalleryManagementPage />} />
            <Route path="settings" element={<ProfileSettingsPage />} />
          </Route>

          {/* Protected Routes (Admin) */}
          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route index element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;