import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';
import RestaurantAreaLayout from './layouts/RestaurantAreaLayout';

// Pages - Public
import IndexPage from './pages/Index';
import LoginPage from './pages/Login';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';

// Pages - Restaurant Area
import RestaurantHomePage from './pages/restaurant/RestaurantHomePage'; // Novo Home
import MenuManagementPage from './pages/restaurant/MenuManagementPage';
import ProfileSettingsPage from './pages/restaurant/ProfileSettingsPage';
import GalleryManagementPage from './pages/restaurant/GalleryManagementPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<IndexPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
          </Route>

          {/* Rotas da Área do Restaurante (Protegidas) */}
          <Route path="/restaurant-area" element={<RestaurantAreaLayout />}>
            <Route index element={<RestaurantHomePage />} />
            <Route path="home" element={<RestaurantHomePage />} /> {/* Rota principal atualizada */}
            <Route path="menu" element={<MenuManagementPage />} />
            <Route path="profile-settings" element={<ProfileSettingsPage />} />
            <Route path="gallery" element={<GalleryManagementPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;