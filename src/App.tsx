import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RestaurantArea from '@/pages/RestaurantArea';
import RestaurantDashboard from '@/pages/restaurant/RestaurantDashboard';
import RestaurantProfileMenu from '@/pages/RestaurantProfileMenu';
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
import Onboarding from '@/pages/Onboarding'; // Importando o componente Onboarding


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} /> {/* Rota do Onboarding */}
        <Route path="/search" element={<SearchRestaurants />} />
        <Route path="/results" element={<RestaurantResults />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/restaurant/:id" element={<RestaurantProfilePublic />} />
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
    </Router>
  );
}

export default App;