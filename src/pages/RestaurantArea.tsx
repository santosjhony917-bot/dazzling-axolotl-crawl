import { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, Bell, Search, Utensils, Home, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import { useUserRole } from "@/hooks/useUserRole";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { Skeleton } from "@/components/ui/skeleton";

const RestaurantArea = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isRestaurant, isPremium } = useUserRole();
  const { restaurant, loading: restaurantLoading } = useRestaurantProfile();

  // Determine the current tab for the bottom navigation
  const getSelectedTab = (pathname: string) => {
    if (pathname.startsWith('/restaurant-home')) return 'home';
    if (pathname.startsWith('/restaurant-menu')) return 'menu';
    if (pathname.startsWith('/restaurant-orders')) return 'orders';
    if (pathname.startsWith('/restaurant-profile-menu')) return 'perfil';
    return 'home';
  };

  const selectedTab = getSelectedTab(location.pathname);

  // Determine header content based on the current route
  const getHeaderContent = () => {
    switch (location.pathname) {
      case '/restaurant-home':
        return { title: "Início", showSearch: true, showNotifications: true };
      case '/restaurant-menu':
        return { title: "Cardápio", showSearch: false, showNotifications: false };
      case '/restaurant-orders':
        return { title: "Pedidos", showSearch: false, showNotifications: true };
      case '/restaurant-profile-menu':
        return { title: "Meu Perfil", showSearch: false, showNotifications: false };
      default:
        return { title: "Área do Restaurante", showSearch: false, showNotifications: false };
    }
  };

  const { title, showSearch, showNotifications } = getHeaderContent();

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-40 w-full rounded-lg mb-4" />
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!isRestaurant) {
    // Should ideally redirect to login or home if not a restaurant
    return (
      <div className="p-4 text-center">
        <p>Acesso negado. Você não está logado como restaurante.</p>
        <Button onClick={() => navigate('/welcome')} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => navigate('/welcome')} // Alterado para navegar para /welcome
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

      {/* Main Content Area */}
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