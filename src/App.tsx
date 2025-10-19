import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { UserProvider } from "./contexts/UserContext"; // Importação adicionada

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import SearchRestaurants from "./pages/SearchRestaurants";
import RestaurantResults from "./pages/RestaurantResults";
import RestaurantProfilePublic from "./pages/RestaurantProfilePublic";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import RestaurantSignup from "./pages/RestaurantSignup";
import RestaurantLogin from "./pages/RestaurantLogin";
import AuthPage from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import RestaurantArea from "./pages/RestaurantArea";
import ClaimRestaurant from "./pages/ClaimRestaurant";
import RestaurantHome from "./pages/RestaurantHome";
import Profile from "./pages/Profile";
import RestaurantProfile from "./pages/RestaurantProfile";

// Admin Pages
import AdminRoute from "./components/admin/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageAdmins from "./pages/admin/ManageAdmins";
import EditRestaurant from "./pages/admin/EditRestaurant";
import PopularCategories from "./pages/admin/PopularCategories";
import Files from "./pages/admin/Files";
import ImportMenu from "./pages/admin/ImportMenu";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === "SIGNED_IN" && session) {
        // Redireciona usuários logados para a página inicial do cliente (/home)
        // Se for um restaurante, o login na página /restaurant-login já redireciona para /restaurant-home
        navigate("/home");
      } else if (_event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return null; // Ou um componente de loading
  }

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/home" element={<Index />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/search-restaurants"
        element={session ? <SearchRestaurants /> : <AuthPage />}
      />
      <Route
        path="/restaurant-results"
        element={session ? <RestaurantResults /> : <AuthPage />}
      />
      <Route
        path="/restaurant-profile/:id"
        element={<RestaurantProfilePublic />}
      />
      <Route path="/profile" element={session ? <Profile /> : <AuthPage />} />
      <Route path="/restaurant-area" element={<RestaurantArea />} />
      <Route path="/restaurant-home" element={<RestaurantHome />} />
      <Route path="/restaurant-profile-menu" element={<RestaurantProfile />} />
      <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} />
      <Route path="/restaurant-signup" element={<RestaurantSignup />} />
      <Route path="/restaurant-login" element={<RestaurantLogin />} />
      <Route path="/claim-restaurant" element={<ClaimRestaurant />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<AdminRoute title="Dashboard"><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/edit-restaurant" element={<AdminRoute title="Gerenciar Restaurantes"><EditRestaurant /></AdminRoute>} />
      <Route path="/admin/manage-admins" element={<AdminRoute title="Gerenciar Administradores"><ManageAdmins /></AdminRoute>} />
      <Route path="/admin/popular-categories" element={<AdminRoute title="Categorias Populares"><PopularCategories /></AdminRoute>} />
      <Route path="/admin/files" element={<AdminRoute title="Gerenciamento de Arquivos"><Files /></AdminRoute>} />
      <Route path="/admin/import" element={<AdminRoute title="Importar Cardápio"><ImportMenu /></AdminRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;