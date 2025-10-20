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
import RestaurantHome from "./pages/RestaurantHome"; // Novo nome para o perfil detalhado
import Profile from "./pages/Profile";
import RestaurantMenu from "./pages/RestaurantMenu";
import RestaurantCategories from "./pages/RestaurantCategories";
import RestaurantAreaHub from "./pages/RestaurantAreaHub"; // Importação adicionada

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageAdmins from "./pages/admin/ManageAdmins";
import EditRestaurant from "./pages/admin/EditRestaurant";
import PopularCategories from "./pages/admin/PopularCategories";
import Files from "./pages/admin/Files";
import ImportMenu from "./pages/admin/ImportMenu";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/home" element={<Index />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Rotas do Cliente */}
      <Route path="/search-restaurants" element={<SearchRestaurants />} />
      <Route path="/restaurant-results" element={<RestaurantResults />} />
      <Route path="/restaurant-profile/:id" element={<RestaurantProfilePublic />} />
      <Route path="/profile" element={<Profile />} />
      
      {/* Hub de Acesso ao Restaurante */}
      <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
      <Route path="/restaurant-signup" element={<RestaurantSignup />} />
      <Route path="/restaurant-login" element={<RestaurantLogin />} />
      <Route path="/claim-restaurant" element={<ClaimRestaurant />} />

      {/* Área do Restaurante (Rotas aninhadas) */}
      <Route path="/restaurant-area" element={<RestaurantArea />}>
        {/* A rota index e /home agora usam o perfil detalhado */}
        <Route index element={<RestaurantHome />} />
        <Route path="home" element={<RestaurantHome />} />
        {/* Rotas de menu e categorias */}
        <Route path="menu" element={<RestaurantMenu />} />
        <Route path="categories" element={<RestaurantCategories />} />
        {/* Rotas de perfil e estatísticas (a serem implementadas) */}
        <Route path="profile-menu" element={<RestaurantHome />} />
        <Route path="stats" element={<div>Estatísticas do Restaurante</div>} />
        <Route path="upgrade" element={<div>Página de Upgrade Premium</div>} />
      </Route>
      
      {/* Admin Routes */}
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