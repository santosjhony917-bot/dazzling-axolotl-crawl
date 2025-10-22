import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Layout principal
import Layout from '@/layouts/Layout';

// Páginas de fluxo inicial e autenticação
import Splash from '@/pages/Splash';
import Onboarding from '@/pages/Onboarding';
import Welcome from '@/pages/Welcome';
import AuthPage from '@/pages/Auth';
import ForgotPassword from '@/pages/ForgotPassword';

// Páginas principais do cliente
import Index from '@/pages/Index';
import Profile from '@/pages/Profile';
import Favorites from '@/pages/Favorites';
import SearchRestaurants from '@/pages/SearchRestaurants';
import RestaurantResults from '@/pages/RestaurantResults';
import RestaurantProfilePublic from '@/pages/RestaurantProfilePublic';
import RestaurantFreeProfile from '@/pages/public/RestaurantFreeProfile'; // Perfil público Free

// Páginas da área do restaurante
import RestaurantArea from '@/pages/RestaurantArea';
import RestaurantAreaHub from '@/pages/RestaurantAreaHub';
import RestaurantLogin from '@/pages/RestaurantLogin';
import RestaurantSignup from '@/pages/RestaurantSignup';
import ClaimRestaurant from '@/pages/ClaimRestaurant';
import RestaurantDashboard from '@/pages/restaurant/RestaurantDashboard';
import RestaurantProfileMenu from '@/pages/RestaurantProfileMenu';
import RestaurantMenu from '@/pages/RestaurantMenu';
import RestaurantCategories from '@/pages/RestaurantCategories';
import RestaurantSearch from '@/pages/restaurant/RestaurantSearch';
import UpgradePage from '@/pages/Upgrade';
import HelpCenter from '@/pages/restaurant/HelpCenter';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          {/* Fluxo Inicial e Autenticação */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Área do Cliente */}
          <Route path="/home" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResults />} />
          <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
          <Route path="/restaurant/:id" element={<RestaurantFreeProfile />} />

          {/* Hub e Autenticação do Restaurante */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />

          {/* Área Logada do Restaurante */}
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route path="home" element={<RestaurantDashboard />} />
            <Route path="profile-menu" element={<RestaurantProfileMenu />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="stats" element={<RestaurantSearch />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="help" element={<HelpCenter />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;