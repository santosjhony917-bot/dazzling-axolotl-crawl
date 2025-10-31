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

  // Lógica para determinar a aba ativa (Mantida apenas para o ClientBottomNav, que ainda usa a prop)
  if (isRestaurantOwner) {
    // A lógica de determinação de aba ativa foi movida para RestaurantBottomNav.tsx
    // Aqui, apenas garantimos que o ClientBottomNav tenha um valor, se necessário.
    // No entanto, ClientBottomNav também precisa ser atualizado para usar useLocation.
    // Por enquanto, vamos manter a lógica de ClientBottomNav no SharedLayoutWrapper para evitar quebrar o ClientBottomNav.
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
      selectedTabKey = 'favorites';
    } else if (isFree && currentPath.startsWith(createPageUrl('restaurant-area/upgrade'))) {
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
      <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
        <main className="flex-1">
          <Outlet />
        </main>
        {/* Removida a prop selectedTab */}
        <RestaurantBottomNav isFree={isFree} /> 
      </div>
    );
  }
  
  // If the user is a regular client, use the client layout structure
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <main className="flex-1">
        <Outlet />
        {/* O ClientBottomNav ainda usa a prop selectedTab, mas a lógica de determinação foi mantida acima */}
      </main>
      <ClientBottomNav selectedTab={selectedTabKey} />
    </div>
  );
};

export default SharedLayoutWrapper;