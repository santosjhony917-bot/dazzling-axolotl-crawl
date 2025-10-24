import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import MenuManagement from './pages/MenuManagement';
import { SessionContextProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/toaster';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import AuthPage from './pages/Auth';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantResults from './pages/RestaurantResults';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import RestaurantProfileMenu from './pages/RestaurantProfileMenu';
import RestaurantCategories from './pages/RestaurantCategories';
import UpgradePage from './pages/Upgrade';
import HelpCenter from './pages/restaurant/HelpCenter';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';

function App() {
  return (
    <SessionContextProvider>
      <Router>
        <Routes>
          {/* Fluxo Inicial */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          
          {/* Rotas do Cliente */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/home" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResults />} />
          <Route path="/restaurant/:id" element={<RestaurantProfilePublic />} />
          
          {/* Rotas da Área do Restaurante (Públicas) */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          
          {/* Área Administrativa do Restaurante (Protegida) */}
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route path="dashboard" element={<RestaurantDashboard />} />
            <Route path="profile-menu" element={<RestaurantProfileMenu />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="settings" element={<Settings />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="help" element={<HelpCenter />} />
            {/* Rota padrão para /restaurant-area */}
            <Route index element={<RestaurantDashboard />} /> 
          </Route>
          
          {/* Rotas de Admin (Antigas, mantidas por enquanto) */}
          <Route path="/admin/*" element={<NotFound />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </SessionContextProvider>
  );
}

export default App;