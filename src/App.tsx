import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './layouts/Layout';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import AuthPage from './pages/Auth';
import Index from './pages/Index';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantResults from './pages/RestaurantResults';
import Favorites from './pages/Favorites';
import RestaurantProfilePage from './pages/public/RestaurantProfilePage';
import NotFound from './pages/NotFound';

// Restaurant Area imports
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import RestaurantProfileMenu from './pages/RestaurantProfileMenu';
import RestaurantMenu from './pages/RestaurantMenu';
import RestaurantCategories from './pages/RestaurantCategories';
import RestaurantSearch from './pages/restaurant/RestaurantSearch';
import UpgradePage from './pages/Upgrade';
import HelpCenter from './pages/restaurant/HelpCenter';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          {/* Public and Customer Routes */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/home" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResults />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/restaurant-profile/:id" element={<RestaurantProfilePage />} />
          
          {/* Restaurant specific public routes */}
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          
          {/* Restaurant private/gated area */}
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route path="home" element={<RestaurantDashboard />} />
            <Route path="profile-menu" element={<RestaurantProfileMenu />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="stats" element={<RestaurantSearch />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="help" element={<HelpCenter />} />
          </Route>

          {/* Catch-all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;