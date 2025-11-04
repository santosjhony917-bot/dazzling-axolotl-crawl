import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import QueryProvider from './providers/QueryProvider';
import ToastProvider from './components/ToastProvider';
import SharedLayoutWrapper from './layouts/SharedLayoutWrapper';
import ProtectedRoute from './components/ProtectedRoute';

// Importar páginas
import Index from './pages/Index';
import Splash from './pages/Splash';
import Welcome from './pages/Welcome';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Legal from './pages/Legal';
import Home from './pages/Home';
import ClientProfilePage from './pages/ClientProfilePage';
import Favorites from './pages/Favorites';
import MenuItemDetails from './pages/MenuItemDetails';
import HelpCenter from './pages/HelpCenter';
import ForgotPassword from './pages/ForgotPassword';
// import RestaurantResults from './pages/RestaurantResults'; // Removido
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import FullMenuPage from './pages/FullMenuPage';
import SearchUnifiedPage from './pages/SearchUnifiedPage'; // Importar a página de busca unificada

// Rotas da Área do Restaurante
import RestaurantArea from './pages/RestaurantArea';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantDashboardPage from './pages/restaurant/RestaurantDashboardPage';
import ProfileSettingsPage from './pages/restaurant/ProfileSettingsPage';
import MenuManagementPage from './pages/restaurant/MenuManagementPage';
import GalleryManagementPage from './pages/restaurant/GalleryManagementPage';
import MetricsPage from './pages/restaurant/MetricsPage';
import Upgrade from './pages/Upgrade';

// Rotas Admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRestaurants from './pages/admin/AdminRestaurants';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPlans from './pages/admin/AdminPlans';
import AdminSettings from './pages/admin/AdminSettings';
import AdminBanners from './pages/admin/AdminBanners';
import AdminEditRestaurant from './pages/admin/AdminEditRestaurant';
import AdminRestaurantMenu from './pages/admin/AdminRestaurantMenu';
import AdminPopularCategories from './pages/admin/PopularCategories';
import AdminUploadInfo from './pages/admin/AdminUploadInfo';
import AdminImport from './pages/admin/ImportMenu';
import AdminFiles from './pages/admin/Files';
import AdminScheduledMetrics from './pages/admin/ScheduledMetrics';
import AdminInstantMetrics from './pages/admin/InstantMetrics';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <QueryProvider>
        <AuthProvider>
          <ToastProvider />
          <Routes>
            {/* Rotas Públicas/Gerais */}
            <Route path="/" element={<Splash />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
            <Route path="/restaurant/:restaurantId/menu-full" element={<FullMenuPage />} />
            <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />

            {/* Rotas de Cliente (com layout compartilhado e proteção) */}
            <Route element={<SharedLayoutWrapper />}>
              <Route path="/home" element={<ProtectedRoute element={<Home />} requiredRole="authenticated" />} />
              <Route path="/onboarding" element={<ProtectedRoute element={<Onboarding />} requiredRole="authenticated" />} />
              <Route path="/profile" element={<ProtectedRoute element={<ClientProfilePage />} requiredRole="authenticated" />} />
              <Route path="/favorites" element={<ProtectedRoute element={<Favorites />} requiredRole="authenticated" />} />
              <Route path="/search-unified" element={<ProtectedRoute element={<SearchUnifiedPage />} requiredRole="authenticated" />} /> {/* Nova página de busca unificada */}
              {/* <Route path="/restaurant-results" element={<ProtectedRoute element={<RestaurantResults />} />} /> */} {/* Removido */}
            </Route>

            {/* Rotas da Área do Restaurante (sem layout compartilhado, com proteção específica) */}
            <Route path="/restaurant-area" element={<RestaurantArea />} />
            <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
            <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
            <Route path="/restaurant-area/claim" element={<ProtectedRoute element={<ClaimRestaurant />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/upgrade" element={<ProtectedRoute element={<Upgrade />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/hub" element={<ProtectedRoute element={<RestaurantAreaHub />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/home" element={<ProtectedRoute element={<RestaurantDashboardPage />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/profile-menu" element={<ProtectedRoute element={<ProfileSettingsPage />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/menu" element={<ProtectedRoute element={<MenuManagementPage />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/gallery" element={<ProtectedRoute element={<GalleryManagementPage />} requiredRole="restaurant_owner" />} />
            <Route path="/restaurant-area/metrics" element={<ProtectedRoute element={<MetricsPage />} requiredRole="restaurant_owner" />} />

            {/* Rotas Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute element={<AdminDashboard />} requiredRole="admin" />} />
            <Route path="/admin/restaurants" element={<ProtectedRoute element={<AdminRestaurants />} requiredRole="admin" />} />
            <Route path="/admin/restaurants/:restaurantId" element={<ProtectedRoute element={<AdminEditRestaurant />} requiredRole="admin" />} />
            <Route path="/admin/restaurants/:restaurantId/menu" element={<ProtectedRoute element={<AdminRestaurantMenu />} requiredRole="admin" />} />
            <Route path="/admin/users" element={<ProtectedRoute element={<AdminUsers />} requiredRole="admin" />} />
            <Route path="/admin/plans" element={<ProtectedRoute element={<AdminPlans />} requiredRole="admin" />} />
            <Route path="/admin/settings" element={<ProtectedRoute element={<AdminSettings />} requiredRole="admin" />} />
            <Route path="/admin/banners" element={<ProtectedRoute element={<AdminBanners />} requiredRole="admin" />} />
            <Route path="/admin/popular-categories" element={<ProtectedRoute element={<AdminPopularCategories />} requiredRole="admin" />} />
            <Route path="/admin/upload-info" element={<ProtectedRoute element={<AdminUploadInfo />} requiredRole="admin" />} />
            <Route path="/admin/import" element={<ProtectedRoute element={<AdminImport />} requiredRole="admin" />} />
            <Route path="/admin/files" element={<ProtectedRoute element={<AdminFiles />} requiredRole="admin" />} />
            <Route path="/admin/scheduled-metrics" element={<ProtectedRoute element={<AdminScheduledMetrics />} requiredRole="admin" />} />
            <Route path="/admin/instant-metrics" element={<ProtectedRoute element={<AdminInstantMetrics />} requiredRole="admin" />} />

            {/* Catch-all para rotas não encontradas */}
            <Route path="*" element={<p>404 - Página Não Encontrada</p>} />
          </Routes>
        </AuthProvider>
      </QueryProvider>
    </Router>
  );
}

export default App;