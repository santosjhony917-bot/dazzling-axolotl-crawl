import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav'; // Importar RestaurantBottomNav
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { restaurant, isPremium } = useAuthData(); // Obter dados do restaurante e isPremium

  // Determine if the current route is one that should display the client bottom navigation bar
  const clientRoutes = ['/home', '/search', '/favorites', '/profile', '/restaurant-results'];
  const showClientNav = clientRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

  // Determine if the current route is a restaurant owner route
  const isRestaurantOwnerRoute = location.pathname.startsWith('/restaurant-area/');

  // Determine if the current route is a public restaurant profile (handled por seu próprio layout)
  // Rotas públicas de perfil de restaurante (ex: /restaurant/id) não devem ser envolvidas por este wrapper
  // mas se por algum motivo forem, não devem ter max-w-md.
  const isPublicRestaurantProfile = location.pathname.startsWith('/restaurant/') && !isRestaurantOwnerRoute;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <main
        className={cn(
          "flex-grow mx-auto w-full",
          !isPublicRestaurantProfile && "max-w-md", // Aplicar max-w-md a todas as rotas do wrapper, exceto perfis públicos
          // Adicionar padding inferior apenas se um dos menus de navegação estiver visível
          (showClientNav || isRestaurantOwnerRoute) ? 'pb-32' : 'pb-0'
        )}
      >
        <Outlet />
      </main>
      
      {/* Bottom Navigation Bar for Client Routes */}
      {showClientNav && (
        <ClientBottomNav />
      )}

      {/* Bottom Navigation Bar for Restaurant Owner Routes */}
      {isRestaurantOwnerRoute && (
        <RestaurantBottomNav isFree={!isPremium} />
      )}
    </div>
  );
};

export default SharedLayoutWrapper;