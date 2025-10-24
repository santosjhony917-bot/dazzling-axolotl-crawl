import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home'; // Usando Home como a tela principal do cliente
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboard from './pages/RestaurantDashboard';
import RestaurantMenu from './pages/RestaurantMenu';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/ToastProvider';
import PublicMenuPage from './pages/PublicMenuPage'; 
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import ForgotPassword from './pages/ForgotPassword';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantResults from './pages/RestaurantResults';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import RestaurantProfileMenu from './pages/restaurant/RestaurantProfileMenu'; // Hub de Perfil
import MenuManager from './pages/restaurant/MenuManager'; // Gerenciador de Menu
import RestaurantProfilePage from './pages/restaurant/Profile'; // Edição de Dados
import Upgrade from './pages/Upgrade';
import HelpCenter from './pages/restaurant/HelpCenter';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <ToastProvider />
      <AuthProvider>
        <Routes>
          {/* Fluxo Inicial */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          
          {/* Autenticação Cliente */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Rotas Públicas de Restaurante */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          
          {/* Rotas Públicas de Perfil/Cardápio */}
          <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
          <Route path="/menu/:restaurantId" element={<PublicMenuPage />} />

          {/* Rotas Protegidas do Cliente */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/search-restaurants" element={<SearchRestaurants />} />
            <Route path="/restaurant-results" element={<RestaurantResults />} />
          </Route>

          {/* Rotas Protegidas da Área do Restaurante */}
          <Route element={<ProtectedRoute />}>
            <Route path="/restaurant-area" element={<RestaurantArea />}>
              <Route index element={<RestaurantDashboard />} />
              <Route path="home" element={<RestaurantDashboard />} />
              <Route path="menu" element={<MenuManager />} />
              <Route path="categories" element={<MenuManager />} />
              <Route path="profile-menu" element={<RestaurantProfileMenu />} />
              <Route path="profile" element={<RestaurantProfilePage />} /> {/* NOVA ROTA DE EDIÇÃO */}
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="help" element={<HelpCenter />} />
              {/* Adicione outras rotas da área do restaurante aqui */}
            </Route>
          </Route>
          
          {/* Rota 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;