import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Home from './pages/Home'; // Usando Home como a tela principal do cliente
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboard from './pages/RestaurantDashboard';
import RestaurantMenu from './pages/RestaurantMenu';
import { AuthProvider } from './context/AuthContext';
import ToastProvider from './components/ToastProvider';
import PublicMenuPage from './pages/PublicMenuPage'; 
import Splash from './pages/Splash';
import Onboarding from './pages/Onboarding';
import Welcome from './pages/Welcome';
import ForgotPassword from './pages/ForgotPassword';
import RestaurantAreaHub from './pages/RestaurantAreaHub';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import ClaimRestaurant from './pages/ClaimRestaurant';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import SearchRestaurants from './pages/SearchRestaurants';
import RestaurantResults from './pages/RestaurantResults';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import RestaurantProfileMenu from './pages/RestaurantProfileMenu';
import Upgrade from './pages/Upgrade';
import HelpCenter from './pages/restaurant/HelpCenter';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import ClientSearchPage from './pages/ClientSearchPage'; // Novo Import
import AdminLayout from './components/admin/AdminLayout'; // Importando AdminLayout
import AdminDashboard from './pages/admin/AdminDashboard'; // Importando páginas Admin
import ManageAdmins from './pages/admin/ManageAdmins';
import EditRestaurant from './pages/admin/EditRestaurant';
import PopularCategories from './pages/admin/PopularCategories';
import Files from './pages/admin/Files';
import ImportMenu from './pages/admin/ImportMenu';
import AdminLogin from './pages/admin/AdminLogin'; // NOVO IMPORT

function App() {
  return (
    <Router>
      <ToastProvider />
      <AuthProvider>
        <Routes>
          {/* Fluxo Inicial */}
          <Route path="/" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/welcome" element={<Welcome />} />
          
          {/* Páginas Legais */}
          <Route path="/legal" element={<Legal />} />
          
          {/* Autenticação Cliente */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Rotas Públicas de Busca */}
          <Route path="/search-client" element={<ClientSearchPage />} /> {/* Rota principal de busca do cliente */}
          <Route path="/search-restaurants" element={<SearchRestaurants />} />
          <Route path="/restaurant-results" element={<RestaurantResults />} />
          
          {/* Rotas Públicas de Restaurante */}
          <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
          
          {/* Rotas Públicas de Perfil/Cardápio */}
          <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
          <Route path="/menu/:restaurantId" element={<PublicMenuPage />} />

          {/* Rotas Protegidas do Cliente */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
          </Route>

          {/* Rotas Protegidas da Área do Restaurante */}
          <Route element={<ProtectedRoute />}>
            <Route path="/restaurant-area" element={<RestaurantArea />}>
              <Route index element={<RestaurantDashboard />} />
              <Route path="home" element={<RestaurantDashboard />} />
              <Route path="menu" element={<RestaurantMenu />} />
              <Route path="categories" element={<RestaurantMenu />} /> {/* Redireciona para Menu */}
              <Route path="profile-menu" element={<RestaurantProfileMenu />} />
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="help" element={<HelpCenter />} />
              {/* Mapeando a rota de 'stats' (Busca do Restaurante) para a página de busca do cliente */}
              <Route path="stats" element={<ClientSearchPage />} /> 
              {/* Adicione outras rotas da área do restaurante aqui */}
            </Route>
          </Route>
          
          {/* Rotas da Área Administrativa (Proteção interna no AdminLayout) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout title="Painel Administrativo" />}>
            {/* Renderiza o Dashboard diretamente na rota index /admin */}
            <Route index element={<AdminDashboard />} /> 
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="manage-admins" element={<ManageAdmins />} />
            <Route path="edit-restaurant" element={<EditRestaurant />} />
            <Route path="popular-categories" element={<PopularCategories />} />
            <Route path="files" element={<Files />} />
            <Route path="import" element={<ImportMenu />} />
          </Route>

          {/* Rota 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;