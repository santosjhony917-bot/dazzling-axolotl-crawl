import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Loader2 } from 'lucide-react';
import { createPageUrl, PathKey } from '@/utils/url'; // Importando utilitários de URL

const SharedLayoutWrapper: React.FC = () => {
  const { restaurant, isPremium, isLoading } = useAuthData();
  const isRestaurantOwner = !!restaurant;
  const isFree = !isPremium;
  
  // Determine the current path key for highlighting the correct tab
  const currentPath = window.location.pathname;
  let selectedTabKey: string = 'home'; // Default fallback

  // Lógica para determinar a aba ativa
  if (isRestaurantOwner) {
    if (currentPath.startsWith(createPageUrl('restaurant-area/profile-menu')) || 
        currentPath.startsWith(createPageUrl('restaurant-area/menu')) ||
        currentPath.startsWith(createPageUrl('restaurant-area/gallery')) ||
        currentPath.startsWith(createPageUrl('restaurant-area/upgrade'))) {
      selectedTabKey = 'perfil';
    } else if (currentPath.startsWith(createPageUrl('restaurant-area/home'))) {
      selectedTabKey = 'home';
    } else if (currentPath.startsWith(createPageUrl('search-unified'))) {
      selectedTabKey = 'search';
    } else if (isPremium && currentPath.startsWith(createPageUrl('favorites'))) {
      // Se for Premium, a aba central é 'favorites'
      selectedTabKey = 'favorites';
    } else if (isFree && currentPath.startsWith(createPageUrl('restaurant-area/upgrade'))) {
      // Se for Free, a aba central é 'upgrade'
      selectedTabKey = 'upgrade';
    }
  } else {
    // Cliente
    if (currentPath.startsWith(createPageUrl('clientProfile'))) {
      selectedTabKey = 'clientProfile';
    } else if (currentPath.startsWith(createPageUrl('favorites'))) {
      selectedTabKey = 'favorites';
    } else if (currentPath.startsWith(createPageUrl('search-unified'))) {
      selectedTabKey = 'search-unified';
    } else if (currentPath === createPageUrl('home') || currentPath === createPageUrl('index')) {
      selectedTabKey = 'home';
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If the user is a restaurant owner, use the restaurant layout structure
  if (isRestaurantOwner) {
    return (
      <div className="min-h-screen bg-white pb-20 max-w-md mx-auto">
        <main className="flex-1">
          <Outlet />
        </main>
        <RestaurantBottomNav selectedTab={selectedTabKey} isFree={isFree} />
      </div>
    );
  }
  
  // If the user is a regular client, use the client layout structure
  return (
    <div className="min-h-screen bg-white pb-20 max-w-md mx-auto">
      <main className="flex-1">
        <Outlet />
        {/* O ClientBottomNav usa as chaves de rota do cliente */}
      </main>
      <ClientBottomNav selectedTab={selectedTabKey} />
    </div>
  );
};

export default SharedLayoutWrapper;