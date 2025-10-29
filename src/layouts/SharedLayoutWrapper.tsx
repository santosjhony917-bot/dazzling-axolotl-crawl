import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Loader2 } from 'lucide-react';

const SharedLayoutWrapper: React.FC = () => {
  const { restaurant, isPremium, isLoading } = useAuthData();
  const isRestaurantOwner = !!restaurant;
  const isFree = !isPremium;
  
  // Determine the current path key for highlighting the correct tab
  const currentPathKey = window.location.pathname.split('/').pop() || 'home';

  if (isLoading) {
    // Should be handled by ProtectedRoute, but defensive coding
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
        <RestaurantBottomNav selectedTab={currentPathKey} isFree={isFree} />
      </div>
    );
  }
  
  // If the user is a regular client, use the client layout structure
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <main className="flex-1">
        <Outlet />
      </main>
      <ClientBottomNav selectedTab={currentPathKey} />
    </div>
  );
};

export default SharedLayoutWrapper;