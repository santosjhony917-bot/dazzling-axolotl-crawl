import { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, Search, Utensils, Home, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { createPageUrl } from "@/utils/url";

const RestaurantArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Para demonstração sem login, vamos mockar um restaurantId
  // Mantemos o mock para que os dados do restaurante sejam carregados no RestaurantHome
  const restaurantId = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  const { restaurant, loading: restaurantLoading } = useRestaurantProfile(restaurantId); 

  // Determine the current tab for the bottom navigation
  const getSelectedTab = (pathname: string) => {
    if (pathname.includes('/restaurant-area/home')) return 'home';
    if (pathname.includes('/restaurant-area/stats')) return 'stats';
    if (pathname.includes('/upgrade')) return 'upgrade';
    if (pathname.includes('/restaurant-area/profile-menu')) return 'perfil';
    // Se estiver em /restaurant-area/menu ou /restaurant-area/categories, mantém 'home' ou 'perfil'
    if (pathname.includes('/restaurant-area/menu') || pathname.includes('/restaurant-area/categories')) return 'home';
    return 'home';
  };

  const selectedTab = getSelectedTab(location.pathname);

  // Determine header content based on the current route
  const getHeaderContent = () => {
    if (location.pathname.includes('/restaurant-area/menu')) {
        return { title: "Cardápio", showSearch: false, showNotifications: false };
    }
    if (location.pathname.includes('/restaurant-area/categories')) {
        return { title: "Gerenciar Categorias", showSearch: false, showNotifications: false };
    }
    if (location.pathname.includes('/restaurant-area/stats')) {
        return { title: "Estatísticas", showSearch: false, showNotifications: true };
    }
    // Default para Home (que agora é o perfil detalhado)
    // Usamos um título padrão se o restaurante ainda estiver carregando ou não for encontrado
    return { title: restaurant?.name || "Meu Perfil", showSearch: false, showNotifications: true };
  };

  const { title, showSearch, showNotifications } = getHeaderContent();

  // Removemos o estado de carregamento aqui para permitir que o Outlet renderize
  // O carregamento será tratado dentro do RestaurantHome.tsx
  // if (restaurantLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
  //       <Skeleton className="h-12 w-full mb-4" />
  //       <Skeleton className="h-40 w-full rounded-lg mb-4" />
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('welcome'))}
          className="text-[#022D68]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <h1 className="text-lg font-bold text-foreground flex-1 text-center">
          {title}
        </h1>

        <div className="flex items-center space-x-2">
          {showNotifications && (
            <Button variant="ghost" size="icon" className="relative text-[#022D68]">
              <Bell className="h-5 w-5" />
              <Badge variant="destructive" className="absolute top-1 right-1 h-2 w-2 p-0 rounded-full border-2 border-white" />
            </Button>
          )}
          {!showNotifications && <div className="w-10 h-10" />} {/* Placeholder for alignment */}
        </div>
      </header>

      {/* Search Bar (only on Home) */}
      {showSearch && (
        <div className="px-4 pt-2 pb-4 bg-white shadow-sm w-full max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pratos, categorias ou clientes..."
              className="pl-10 bg-gray-100 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      )}

      {/* Main Content Area - Renders the matched sub-route (e.g., RestaurantHome) */}
      <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto z-30">
        <RestaurantBottomNav selectedTab={selectedTab} />
      </div>
    </div>
  );
};

export default RestaurantArea;