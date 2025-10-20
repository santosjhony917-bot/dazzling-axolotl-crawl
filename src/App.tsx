import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import RestaurantHome from "./pages/restaurant/RestaurantHome";
import RestaurantLogin from "./pages/RestaurantLogin";
import RestaurantSignup from "./pages/RestaurantSignup";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import SearchRestaurants from "./pages/SearchRestaurants";
import Upgrade from "./pages/Upgrade";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas de Cliente (Customer) */}
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<Index />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/search-restaurants" element={<SearchRestaurants />} />
        <Route path="/upgrade" element={<Upgrade />} />
        
        {/* Rotas de Autenticação */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/welcome" element={<Welcome />} />
        
        {/* Rotas da Área do Restaurante */}
        <Route path="/restaurant-area/home" element={<RestaurantHome />} />
        <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
        <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
        
        {/* Rota 404 simples */}
        <Route path="*" element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-800">404</h1>
            <p className="text-xl text-gray-600 mt-2">Oops! Page not found</p>
            <a href="/" className="mt-6 text-blue-600 hover:underline">Return to Home</a>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}