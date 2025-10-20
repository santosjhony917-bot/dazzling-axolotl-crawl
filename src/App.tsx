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
        <Route path="/upgrade" element={<Upgrade />} />
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
          <Route path="home" element={<RestaurantProfile />} />
          <Route path="profile-menu" element={<RestaurantProfile />} />
          <Route path="stats" element={<div>Estatísticas Placeholder</div>} />
          <Route path="menu" element={<RestaurantMenu />} />
          <Route path="categories" element={<RestaurantCategories />} />
          {/* Rotas de Suporte e Gerenciamento */}
          <Route path="manage-subscription" element={<div>Gerenciar Assinatura Placeholder</div>} />
          <Route path="help-center" element={<div>Central de Ajuda Placeholder</div>} />
          <Route path="support" element={<div>Suporte Placeholder</div>} />
          <Route path="terms" element={<div>Termos Placeholder</div>} />
        </Route>

        {/* Rotas de Admin */}
        <Route path="/admin" element={<RestaurantArea />}>
          <Route path="dashboard" element={<div>Admin Dashboard Placeholder</div>} />
          <Route path="edit-restaurant" element={<div>Edit Restaurant Placeholder</div>} />
          <Route path="manage-admins" element={<div>Manage Admins Placeholder</div>} />
          <Route path="popular-categories" element={<div>Popular Categories Placeholder</div>} />
          <Route path="files" element={<div>Files Placeholder</div>} />
          <Route path="import" element={<div>Import Menu Placeholder</div>} />
        </Route>

        {/* Rota 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}