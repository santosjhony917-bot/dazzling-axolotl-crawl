"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import MenuManagement from '@/pages/restaurant/MenuManagement'; // ADICIONADO
import RestaurantProfilePage from '@/pages/public/RestaurantProfilePage';
import RestaurantDashboardPage from '@/pages/restaurant/RestaurantDashboardPage';
import ProfileMenuPage from '@/pages/restaurant/ProfileMenuPage';
import GalleryManagement from '@/pages/restaurant/GalleryManagement';
import MetricsPage from '@/pages/restaurant/MetricsPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePage />} />

        {/* Rotas Protegidas (Área do Restaurante) */}
        <Route path="/restaurant-area" element={<ProtectedRoute />}>
          <Route index element={<RestaurantAreaHub />} />
          <Route path="dashboard" element={<RestaurantDashboardPage />} />
          <Route path="profile-menu" element={<ProfileMenuPage />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="gallery" element={<GalleryManagement />} />
          <Route path="metrics" element={<MetricsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;