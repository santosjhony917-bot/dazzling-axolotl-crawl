import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import SearchRestaurants from "./pages/SearchRestaurants";
import RestaurantResults from "./pages/RestaurantResults";
import RestaurantProfilePublic from "./pages/RestaurantProfilePublic";
import RestaurantSignup from "./pages/RestaurantSignup";
import RestaurantLogin from "./pages/RestaurantLogin";
import AuthPage from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import RestaurantArea from "./pages/RestaurantArea";
import ClaimRestaurant from "./pages/ClaimRestaurant";
import RestaurantHome from "./pages/RestaurantHome";
import Profile from "./pages/Profile";
import RestaurantProfile from "./pages/RestaurantProfile";
import RestaurantAreaHub from "./pages/RestaurantAreaHub";
import RestaurantMenu from "./pages/RestaurantMenu";
import RestaurantCategories from "./pages/RestaurantCategories";
import RestaurantFreeProfile from "./pages/RestaurantFreeProfile"; // Adicionado
// Os imports das páginas de gerenciamento do restaurante foram removidos

// Admin Pages
// import AdminRoute from "./components/admin/AdminRoute"; // Removido
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
        // Redirecionamento removido, agora o usuário permanece na página atual ou é redirecionado manualmente
        // navigate("/auth-redirect", { replace: true }); // Removido
      } else if (_event === "SIGNED_OUT") {
        // Redireciona para a tela de autenticação geral
        navigate("/auth", { replace: true });
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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Rotas do Cliente (agora acessíveis sem sessão) */}
      <Route path="/search-restaurants" element={<SearchRestaurants />} />
      <Route path="/restaurant-results" element={<RestaurantResults />} />
      <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
      <Route path="/profile" element={<Profile />} />
      
      {/* Hub de Acesso ao Restaurante (Não requer sessão) */}
      <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
      <Route path="/restaurant-signup" element={<RestaurantSignup />} />
      <Route path="/restaurant-login" element={<RestaurantLogin />} />
      <Route path="/claim-restaurant" element={<ClaimRestaurant />} />

      {/* Área do Restaurante (agora acessível sem role de restaurante) */}
      <Route path="/restaurant-area" element={<RestaurantArea />}>
        <Route index element={<RestaurantFreeProfile />} />
        <Route path="home" element={<RestaurantFreeProfile />} />
        <Route path="profile-menu" element={<RestaurantProfile />} />
        <Route path="menu" element={<RestaurantMenu />} />
        <Route path="categories" element={<RestaurantCategories />} />
      </Route>
      
      {/* Rotas de Dashboard (Antigas, removidas) */}
      {/* <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} /> */}
      {/* <Route path="/restaurant-home" element={<RestaurantHome />} /> */}
      {/* <Route path="/restaurant-profile-menu" element={<RestaurantProfile />} /> */}


      {/* Admin Routes (agora acessíveis sem AdminRoute) */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/edit-restaurant" element={<EditRestaurant />} />
      <Route path="/admin/manage-admins" element={<ManageAdmins />} />
      <Route path="/admin/popular-categories" element={<PopularCategories />} />
      <Route path="/admin/files" element={<Files />} />
      <Route path="/admin/import" element={<ImportMenu />} />

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
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;