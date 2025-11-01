"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./Index";
import Home from "./Home";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Profile from "./Profile";
import Settings from "./Settings";
import NotFound from "./NotFound";
import Unauthorized from "./Unauthorized";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import RestaurantManage from "./RestaurantManage";
import RestaurantMenu from "./RestaurantMenu";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "../integrations/supabase/session-provider";
import ProtectedRoute from "../components/ProtectedRoute";
import PopularDishes from "./PopularDishes";
import SharedLayoutWrapper from "../components/SharedLayoutWrapper";
import AdminLayout from "../components/AdminLayout";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/popular-dishes" element={<PopularDishes />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Rotas Protegidas do Cliente (Usando SharedLayoutWrapper) */}
            <Route element={<ProtectedRoute requiredRole="authenticated" layout={SharedLayoutWrapper} />}>
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Rotas Protegidas da Área do Restaurante (Usando SharedLayoutWrapper e Proteção de Role) */}
            <Route element={<ProtectedRoute requiredRole="restaurant_owner" layout={SharedLayoutWrapper} />}>
              {/* O Home do Restaurante Free é a página Home do Cliente */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/restaurant/:id/manage" element={<RestaurantManage />} />
              <Route path="/restaurant/:id/menu" element={<RestaurantMenu />} />
            </Route>

            {/* Rotas de Administração */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute requiredRole="admin" layout={AdminLayout} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {/* Adicione outras rotas de admin aqui */}
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;