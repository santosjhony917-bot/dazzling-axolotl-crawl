import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from '@/layouts/Layout';
import Splash from '@/pages/Splash';
import Onboarding from '@/pages/Onboarding';
import Welcome from '@/pages/Welcome';
import AuthPage from '@/pages/Auth';
import ForgotPassword from '@/pages/ForgotPassword';
import Index from '@/pages/Index';
import Profile from '@/pages/Profile';
import SearchRestaurants from '@/pages/SearchRestaurants';
import RestaurantResults from '@/pages/RestaurantResults';
import Favorites from '@/pages/Favorites';
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import RestaurantArea from '@/pages/RestaurantArea';
import RestaurantDashboard from '@/pages/restaurant/RestaurantDashboard';
import RestaurantProfilePage from '@/pages/restaurant-area/Profile';
import RestaurantMenu from '@/pages/RestaurantMenu';
import RestaurantCategories from '@/pages/RestaurantCategories';
import RestaurantSearch from '@/pages/restaurant/RestaurantSearch';
import UpgradePage from '@/pages/Upgrade';
import HelpCenter from '@/pages/restaurant/HelpCenter';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/home" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResults />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
          
          {/* Rotas da Área do Restaurante */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route path="home" element={<RestaurantDashboard />} />
            <Route path="profile-menu" element={<RestaurantProfilePage />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="stats" element={<RestaurantSearch />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="help" element={<HelpCenter />} />
          </Route>

          {/* Rota de fallback para 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;