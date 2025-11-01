import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientBottomNav from '@/components/ClientBottomNav';
import { useAuthData } from '@/context/AuthContext'; // CORRIGIDO: Usando o hook correto
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthData(); // Usando useAuthData

  // Determine if the current route is one that should display the bottom navigation bar
  const clientRoutes = ['/home', '/search-unified', '/favorites', '/profile'];
  
  // Ajustando a lógica para rotas do cliente
  const showClientNav = clientRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

  // Determine if the current route is a public route (e.g., restaurant profile)
  const isPublicRoute = location.pathname.startsWith('/restaurant/');

  // Determine if the current route is a management route (e.g., /restaurant-management)
  // No seu novo roteamento, as rotas de gerenciamento estão sob /restaurant-area/
  const isManagementRoute = location.pathname.startsWith('/restaurant-area/');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <main
        className={cn(
          "flex-grow",
          // Add padding bottom only if client nav is shown
          showClientNav ? 'pb-20' : 'pb-0',
          // Center content for public/management routes if needed, otherwise full width
          isPublicRoute || isManagementRoute ? 'mx-auto w-full' : 'mx-auto w-full max-w-md'
        )}
      >
        <Outlet />
      </main>
      
      {/* Bottom Navigation Bar for Client Routes */}
      {showClientNav && (
        <ClientBottomNav />
      )}
    </div>
  );
};

export default SharedLayoutWrapper;