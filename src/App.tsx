"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized"; // Importar a nova página
import AdminLogin from "./pages/AdminLogin"; // Importar a nova página
import AdminDashboard from "./pages/AdminDashboard"; // Importar a nova página
import RestaurantManage from "./pages/RestaurantManage"; // Importar a nova página
import RestaurantMenu from "./pages/RestaurantMenu"; // Importar a nova página

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "./integrations/supabase/session-provider";
import ProtectedRoute from "./components/ProtectedRoute";
import PopularDishes from "./pages/PopularDishes";
import SharedLayoutWrapper from "./components/SharedLayoutWrapper"; // Importar o layout compartilhado
import AdminLayout from "./components/AdminLayout"; // Importar o layout do admin

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} /> {/* Página inicial pública */}
            <Route path="/login" element={<Login />} />
            <Route path="/popular-dishes" element={<PopularDishes />} />
            <Route path="/unauthorized" element={<Unauthorized />} /> {/* Rota para acesso negado */}

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