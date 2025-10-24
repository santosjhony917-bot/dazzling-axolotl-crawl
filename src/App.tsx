import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Layout from './layouts/Layout';

// Componente de Fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <Loader2 className="h-8 w-8 animate-spin text-[#022D68]" />
  </div>
);

// Lazy loading das páginas
const Splash = lazy(() => import('./pages/Splash'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Index = lazy(() => import('./pages/Index'));
const Profile = lazy(() => import('./pages/Profile'));
const Favorites = lazy(() => import('./pages/Favorites'));
const SearchRestaurants = lazy(() => import('./pages/SearchRestaurants'));
const RestaurantResults = lazy(() => import('./pages/RestaurantResults'));
const RestaurantProfilePublic = lazy(() => import('./pages/RestaurantProfilePublic'));
const RestaurantFreeProfile = lazy(() => import('./pages/public/RestaurantFreeProfile'));

// Rotas da Área do Restaurante
const RestaurantAreaHub = lazy(() => import('./pages/RestaurantAreaHub'));
const RestaurantLogin = lazy(() => import('./pages/RestaurantLogin'));
const RestaurantSignup = lazy(() => import('./pages/RestaurantSignup'));
const ClaimRestaurant = lazy(() => import('./pages/ClaimRestaurant'));
const RestaurantArea = lazy(() => import('./pages/RestaurantArea'));
const RestaurantDashboard = lazy(() => import('./pages/restaurant/RestaurantDashboard'));
const RestaurantProfileMenu = lazy(() => import('./pages/RestaurantProfileMenu'));
const RestaurantMenu = lazy(() => import('./pages/RestaurantMenu'));
const RestaurantCategories = lazy(() => import('./pages/RestaurantCategories'));
const UpgradePage = lazy(() => import('./pages/Upgrade'));
const HelpCenter = lazy(() => import('./pages/restaurant/HelpCenter'));
const RestaurantSearch = lazy(() => import('./pages/restaurant/RestaurantSearch'));

// Rotas do Admin
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const EditRestaurant = lazy(() => import('./pages/admin/EditRestaurant'));
const ManageAdmins = lazy(() => import('./pages/admin/ManageAdmins'));
const PopularCategories = lazy(() => import('./pages/admin/PopularCategories'));
const Files = lazy(() => import('./pages/admin/Files'));
const ImportMenu = lazy(() => import('./pages/admin/ImportMenu'));

// Rota 404
const NotFound = lazy(() => import('./pages/NotFound'));


function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Rotas Públicas/Iniciais */}
            <Route index element={<Splash />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Rotas do Cliente */}
            <Route path="/home" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/search-restaurants" element={<SearchRestaurants />} />
            <Route path="/restaurant-results" element={<RestaurantResults />} />
            <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
            <Route path="/restaurant/:id" element={<RestaurantFreeProfile />} />

            {/* Rotas da Área do Restaurante */}
            <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
            <Route path="/restaurant-login" element={<RestaurantLogin />} />
            <Route path="/restaurant-signup" element={<RestaurantSignup />} />
            <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
            
            <Route path="/restaurant-area" element={<RestaurantArea />}>
              <Route path="home" element={<RestaurantDashboard />} />
              <Route path="stats" element={<RestaurantSearch />} />
              <Route path="profile-menu" element={<RestaurantProfileMenu />} />
              <Route path="menu" element={<RestaurantMenu />} />
              <Route path="categories" element={<RestaurantCategories />} />
              <Route path="upgrade" element={<UpgradePage />} />
              <Route path="help" element={<HelpCenter />} />
            </Route>

            {/* Rotas do Admin */}
            <Route path="/admin" element={<AdminLayout title="Dashboard"><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/edit-restaurant" element={<AdminLayout title="Editar Restaurante"><EditRestaurant /></AdminLayout>} />
            <Route path="/admin/manage-admins" element={<AdminLayout title="Gerenciar Administradores"><ManageAdmins /></AdminLayout>} />
            <Route path="/admin/popular-categories" element={<AdminLayout title="Categorias Populares"><PopularCategories /></AdminLayout>} />
            <Route path="/admin/files" element={<AdminLayout title="Arquivos"><Files /></AdminLayout>} />
            <Route path="/admin/import" element={<AdminLayout title="Importar Cardápio"><ImportMenu /></AdminLayout>} />

            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;