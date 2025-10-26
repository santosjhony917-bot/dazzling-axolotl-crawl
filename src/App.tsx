import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import AuthPage from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import Legal from './pages/Legal';
import Home from './pages/Home';
import ClientProfilePage from './pages/ClientProfilePage';
import Favorites from './pages/Favorites';
import SearchUnifiedPage from './pages/SearchUnifiedPage';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantResultsPage from './pages/RestaurantResults';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';

// Restaurant Area
import RestaurantArea from './pages/RestaurantArea';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import RestaurantProfilePage from './pages/restaurant-area/Profile';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/restaurant/GalleryManagement';
import UpgradePage from './pages/Upgrade';
import HelpCenter from './pages/restaurant/HelpCenter';
import RestaurantSearch from './pages/restaurant/Search';

// Admin Area
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import ManageAdmins from './pages/admin/ManageAdmins';
import AdminPlans from './pages/admin/AdminPlans';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import ImportMenu from './pages/admin/ImportMenu';
import EditRestaurant from './pages/admin/EditRestaurant';
import PopularCategories from './pages/admin/PopularCategories';
import Files from './pages/admin/Files';


function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/legal" element={<Legal />} />
        
        {/* Rotas Públicas de Restaurante */}
        <Route path="/restaurant-area" element={<RestaurantAreaHub />} />
        <Route path="/restaurant-login" element={<RestaurantLogin />} />
        <Route path="/restaurant-signup" element={<RestaurantSignup />} />
        <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
        
        {/* Rotas de Busca e Perfil Público */}
        <Route path="/results" element={<RestaurantResultsPage />} />
        <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
        <Route path="/search-restaurants" element={<SearchRestaurants />} />

        {/* Rotas Protegidas (Cliente e Proprietário) */}
        <Route element={<ProtectedRoute requiredRole="authenticated" />}>
          <Route element={<Layout />}>
            {/* Rotas de Cliente */}
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<ClientProfilePage />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/search-unified" element={<SearchUnifiedPage />} />
            
            {/* Rotas da Área do Restaurante (Protegidas por restaurant_owner) */}
            <Route path="/restaurant-area" element={<ProtectedRoute requiredRole="restaurant_owner" element={<RestaurantArea />} />}>
              <Route path="home" element={<RestaurantDashboard />} />
              <Route path="profile-menu" element={<RestaurantProfilePage />} />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="gallery" element={<GalleryManagement />} />
              <Route path="upgrade" element={<UpgradePage />} />
              <Route path="help" element={<HelpCenter />} />
              <Route path="stats" element={<RestaurantSearch />} />
            </Route>
          </Route>
        </Route>
        
        {/* Rotas de Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRoute requiredRole="admin" element={<AdminLayout />} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/restaurants" element={<AdminRestaurants />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/import" element={<ImportMenu />} />
          <Route path="/admin/edit-restaurant" element={<EditRestaurant />} />
          <Route path="/admin/popular-categories" element={<PopularCategories />} />
          <Route path="/admin/files" element={<Files />} />
        </Route>

        {/* Rota 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;