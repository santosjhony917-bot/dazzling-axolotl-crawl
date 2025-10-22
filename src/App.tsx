import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Layout from '@/layouts/Layout';
import CustomerProfilePage from '@/pages/Profile'; 
import RestaurantProfilePage from '@/pages/restaurant-area/Profile'; 
import Welcome from '@/pages/Welcome'; // Importa a página Welcome
import AuthPage from '@/pages/Auth'; // Importa a página Auth
import ForgotPassword from '@/pages/ForgotPassword'; // Importa a página ForgotPassword
import Onboarding from '@/pages/Onboarding'; // Importa a página Onboarding
import RestaurantArea from '@/pages/RestaurantArea'; // Importa a área do restaurante
import RestaurantDashboard from '@/pages/restaurant/RestaurantDashboard';
import RestaurantProfileMenu from '@/pages/restaurant/RestaurantProfileMenu';
import RestaurantMenu from '@/pages/RestaurantMenu';
import RestaurantCategories from '@/pages/RestaurantCategories';
import UpgradePage from '@/pages/Upgrade';
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import SearchRestaurants from '@/pages/SearchRestaurants';
import RestaurantResults from '@/pages/RestaurantResults';
import Favorites from '@/pages/Favorites';
import Splash from '@/pages/Splash';
import RestaurantSearch from '@/pages/restaurant/RestaurantSearch';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Splash />} />
          
          {/* Rotas de Cliente */}
          <Route path="/home" element={<Index />} />
          <Route path="/profile" element={<CustomerProfilePage />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResults />} />
          <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />

          {/* Rotas de Autenticação */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Rotas da Área do Restaurante (Hub) */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />

          {/* Rotas Protegidas do Restaurante */}
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route index element={<RestaurantDashboard />} />
            <Route path="home" element={<RestaurantDashboard />} />
            <Route path="profile" element={<RestaurantProfilePage />} /> {/* Rota antiga, mantida por segurança */}
            <Route path="profile-menu" element={<RestaurantProfileMenu />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="stats" element={<RestaurantSearch />} />
            <Route path="upgrade" element={<UpgradePage />} />
          </Route>
          
          {/* Rota 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;