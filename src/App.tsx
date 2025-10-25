import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContextProvider } from './hooks/useAuthContext';
import { Toaster } from 'react-hot-toast';
import Splash from './pages/Splash';
import Home from './pages/Home';
import Auth from './pages/Auth';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import ClaimRestaurant from './pages/ClaimRestaurant';
import RestaurantDashboard from './pages/RestaurantDashboard';
import ProfileManagementLayout from './components/restaurant/ProfileManagementLayout';
import MenuManagement from './pages/MenuManagement';
import Legal from './pages/Legal';
import SearchClient from './pages/SearchClient';
import RestaurantProfile from './pages/RestaurantProfile';
import ProfileRedirect from './components/ProfileRedirect';

function App() {
  return (
    <AuthContextProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas/Gerais */}
          <Route path="/" element={<Splash />} />
          <Route path="/welcome" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/home" element={<Home />} />
          <Route path="/search-client" element={<SearchClient />} />
          <Route path="/restaurant/:restaurantId" element={<RestaurantProfile />} />

          {/* Rota de Perfil Unificada (Redireciona com base no papel) */}
          <Route path="/profile" element={<ProfileRedirect />} /> 

          {/* Rotas da Área do Restaurante */}
          <Route path="/restaurant-area" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
          <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
          <Route path="/restaurant-area/claim" element={<ClaimRestaurant />} />
          <Route path="/restaurant-area/home" element={<RestaurantDashboard />} />
          <Route path="/restaurant-area/profile-menu" element={<ProfileManagementLayout />} />
          <Route path="/restaurant-area/menu" element={<MenuManagement />} />
          
          {/* Rotas de Erro/Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthContextProvider>
  );
}

export default App;