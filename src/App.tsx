import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/integrations/supabase/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home, Utensils, Heart, User, LogIn } from "lucide-react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./pages/Index.tsx";
import RestaurantPage from "./pages/RestaurantPage.tsx";
import FavoritesPage from "./pages/FavoritesPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RestaurantAreaLayout from "./components/layouts/RestaurantAreaLayout.tsx";
import DashboardPage from "./pages/restaurant/DashboardPage.tsx";
import MenuPage from "./pages/restaurant/MenuPage.tsx";
import ProfileSettingsPage from "./pages/restaurant/ProfileSettingsPage.tsx";
import RegisterRestaurantPage from "./pages/RegisterRestaurantPage.tsx";
import { BottomNav } from "./components/BottomNav.tsx";
import { useAuth } from "./integrations/supabase/auth/AuthProvider";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();

  const getNavItems = () => {
    const items = [
      { href: "/", label: "Início", icon: <Home /> },
      { href: "/search", label: "Busca", icon: <Utensils /> },
      { href: "/favorites", label: "Favoritos", icon: <Heart /> },
    ];
    if (user) {
      items.push({ href: "/profile", label: "Perfil", icon: <User /> });
    } else {
      items.push({ href: "/login", label: "Login", icon: <LogIn /> });
    }
    return items;
  };

  return (
    <TooltipProvider>
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-restaurant" element={<RegisterRestaurantPage />} />
          <Route path="/restaurant-area" element={<RestaurantAreaLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="profile-menu" element={<ProfileSettingsPage />} />
          </Route>
        </Routes>
        <BottomNav navItems={getNavItems()} />
      </Router>
    </TooltipProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;