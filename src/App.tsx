import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RestaurantArea from '@/pages/RestaurantArea';
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
import HelpCenter from '@/pages/restaurant/HelpCenter';
import Onboarding from '@/pages/Onboarding';
import { Loader2 } from 'lucide-react';

// Lazy loading para páginas pesadas
const Index = lazy(() => import('@/pages/Index'));
const Profile = lazy(() => import('@/pages/Profile'));
const Auth = lazy(() => import('@/pages/Auth'));
const Welcome = lazy(() => import('@/pages/Welcome'));
const RestaurantFreeProfile = lazy(() => import('@/pages/public/RestaurantFreeProfile'));

// Componente de fallback para lazy loading
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-[#E47948]" />
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/home" element={<Index />} />
          <Route path="/search" element={<SearchRestaurants />} />
          <Route path="/results" element={<RestaurantResults />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/restaurant/:id" element={<RestaurantProfilePublic />} />
          <Route path="/restaurant-profile/:id" element={<RestaurantFreeProfile />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          
          <Route path="/restaurant-area" element={<RestaurantArea />}>
            <Route path="home" element={<RestaurantDashboard />} />
            <Route path="profile-menu" element={<RestaurantProfileMenu />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="categories" element={<RestaurantCategories />} />
            <Route path="stats" element={<RestaurantSearch />} />
            <Route path="upgrade" element={<UpgradePage />} />
            <Route path="help" element={<HelpCenter />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;