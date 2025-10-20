import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import RestaurantArea from "./pages/RestaurantArea"; // Usando o layout principal da área do restaurante
import RestaurantProfile from "./pages/RestaurantHome";
import RestaurantLogin from "./pages/RestaurantLogin";
import RestaurantSignup from "./pages/RestaurantSignup";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import SearchRestaurants from "./pages/SearchRestaurants";
import Upgrade from "./pages/Upgrade";
import RestaurantMenu from "./pages/RestaurantMenu";
import RestaurantCategories from "./pages/RestaurantCategories";
import NotFound from "./pages/NotFound";
import RestaurantAreaHub from "./pages/RestaurantAreaHub";
import ClaimRestaurant from "./pages/ClaimRestaurant";
import ForgotPassword from "./pages/ForgotPassword";
import RestaurantResults from "./pages/RestaurantResults";
import RestaurantProfilePublic from "./pages/RestaurantProfilePublic";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EditRestaurant from "./pages/admin/EditRestaurant";
import ManageAdmins from "./pages/admin/ManageAdmins";
import PopularCategories from "./pages/admin/PopularCategories";
import Files from "./pages/admin/Files";
import ImportMenu from "./pages/admin/ImportMenu";
import AdminLayout from "./components/admin/AdminLayout";
import Favorites from "./pages/Favorites"; // Importando a nova página


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Cliente (Customer) */}
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Index />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search-restaurants" element={<SearchRestaurants />} />
        <Route path="/restaurant-results" element={<RestaurantResults />} />
        <Route path="/favorites" element={<Favorites />} /> {/* Nova Rota */}
        <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
        
        {/* Rotas de Autenticação */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Rotas da Área do Restaurante */}
        <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
        <Route path="/restaurant-login" element={<RestaurantLogin />} />
        <Route path="/restaurant-signup" element={<RestaurantSignup />} />
        <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
        
        {/* Rotas Aninhadas da Área do Restaurante (Usando Layout) */}
        <Route path="/restaurant-area" element={<RestaurantArea />}>
          {/* O perfil do restaurante é a tela principal da área logada */}
          <Route path="home" element={<RestaurantProfile />} />
          <Route path="profile-menu" element={<RestaurantProfile />} />
          <Route path="stats" element={<div>Estatísticas Placeholder</div>} />
          <Route path="menu" element={<RestaurantMenu />} />
          <Route path="categories" element={<RestaurantCategories />} />
          {/* Rota de Upgrade do Restaurante (agora aninhada) */}
          <Route path="upgrade" element={<Upgrade />} /> 
          {/* Rotas de Suporte e Gerenciamento */}
          <Route path="manage-subscription" element={<div>Gerenciar Assinatura Placeholder</div>} />
          <Route path="help-center" element={<div>Central de Ajuda Placeholder</div>} />
          <Route path="support" element={<div>Suporte Placeholder</div>} />
          <Route path="terms" element={<div>Termos Placeholder</div>} />
        </Route>

        {/* Rotas de Admin */}
        <Route path="/admin" element={<AdminLayout title="Painel Administrativo" children={undefined} />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="edit-restaurant" element={<EditRestaurant />} />
          <Route path="manage-admins" element={<ManageAdmins />} />
          <Route path="popular-categories" element={<PopularCategories />} />
          <Route path="files" element={<Files />} />
          <Route path="import" element={<ImportMenu />} />
        </Route>

        {/* Rota 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}