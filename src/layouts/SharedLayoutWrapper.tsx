import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { restaurant, isPremium } = useAuthData();

  const clientNavRoutes = ['/home', '/favorites', '/search-unified', '/profile']; 
  const showClientNav = clientNavRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

  const isManagementRoute = location.pathname.startsWith('/restaurant-area/');
  const showRestaurantNav = isManagementRoute && !!restaurant;

  const showAnyBottomNav = showClientNav || showRestaurantNav;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main
        className={cn(
          "flex-grow",
          showAnyBottomNav ? 'pb-20' : 'pb-0',
          isManagementRoute ? 'mx-auto w-full' : 'mx-auto w-full max-w-md' 
        )}
      >
        <Outlet />
      </main>
      
      {showClientNav && (
        <ClientBottomNav />
      )}
      {showRestaurantNav && (
        <RestaurantBottomNav isFree={!isPremium} />
      )}
    </div>
  );
};

export default SharedLayoutWrapper;