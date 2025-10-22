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
import { useUserRole } from "@/hooks/useUserRole"; // Importando useUserRole

const RestaurantArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Para demonstração sem login, vamos mockar um restaurantId
  const restaurantId = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  const { restaurant, loading: restaurantLoading } = useRestaurantProfile(restaurantId); 
  const { isPremium, isLoading: roleLoading } = useUserRole(); // Usando useUserRole
  const isFree = !isPremium; // O restaurante é Free se não for Premium

  // Determine the current tab for the bottom navigation
  const getSelectedTab = (pathname: string) => {
    if (pathname.includes('/restaurant-area/home')) return 'home';
    if (pathname.includes('/restaurant-area/stats')) return 'stats';
    if (pathname.includes('/restaurant-area/upgrade')) return 'upgrade';
    if (pathname.includes('/restaurant-area/profile-menu')) return 'perfil';
    // Se estiver em /restaurant-area/menu ou /restaurant-area/categories, mantém 'perfil'
    if (pathname.includes('/restaurant-area/menu') || pathname.includes('/restaurant-area/categories')) return 'perfil';
    return 'home';
  };

  const selectedTab = getSelectedTab(location.pathname);
  
  // Verifica se a rota atual é a Home/Dashboard (que tem seu próprio header)
  const isDashboardRoute = location.pathname.endsWith('/restaurant-area/home');
  const isProfileMenuRoute = location.pathname.endsWith('/restaurant-area/profile-menu');
  const isStatsRoute = location.pathname.includes('/restaurant-area/stats');

  // Determine header content based on the current route
  const getHeaderContent = () => {
    if (isDashboardRoute || isProfileMenuRoute || isStatsRoute) {
        return { title: "", showHeader: false }; // Não mostra header no dashboard ou no perfil detalhado
    }
    if (location.pathname.includes('/restaurant-area/menu')) {
        return { title: "Cardápio", showHeader: true };
    }
    if (location.pathname.includes('/restaurant-area/categories')) {
        return { title: "Gerenciar Categorias", showHeader: true };
    }
    if (location.pathname.includes('/restaurant-area/stats')) {
        return { title: "Buscar", showHeader: false };
    }
    if (location.pathname.includes('/restaurant-area/upgrade')) {
        return { title: "Plano Premium", showHeader: true };
    }
    // Default para rotas não mapeadas
    return { title: "Área do Restaurante", showHeader: true };
  };

  const { title, showHeader } = getHeaderContent();

  // Se estiver carregando o perfil ou o role, podemos mostrar um placeholder
  if (restaurantLoading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA]">
        <Skeleton className="h-10 w-40 mb-4" />
        <p className="text-gray-500">Carregando área do restaurante...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FA' }}>
      
      {/* Header (Renderizado apenas em sub-rotas que não são o Dashboard/Perfil) */}
      {showHeader && (
        <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('restaurant-area-hub'))}
            className="text-[#022D68]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-bold text-foreground flex-1 text-center">
            {title}
          </h1>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="relative text-[#022D68]">
              <Bell className="h-5 w-5" />
              <Badge variant="destructive" className="absolute top-1 right-1 h-2 w-2 p-0 rounded-full border-2 border-white" />
            </Button>
          </div>
        </header>
      )}

      {/* Main Content Area - Renders the matched sub-route (e.g., RestaurantDashboard) */}
      <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto z-30">
        <RestaurantBottomNav selectedTab={selectedTab} isFree={isFree} />
      </div>
    </div>
  );
};

export default RestaurantArea;