import React from 'react';
import { Outlet } from 'react-router-dom';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useAuthData } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const RestaurantOwnerLayout: React.FC = () => {
  const { isPremium, isLoading } = useAuthData();
  const isFree = !isPremium;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <main className="flex-1">
        <Outlet />
      </main>
      <RestaurantBottomNav selectedTab={window.location.pathname.split('/').pop()} isFree={isFree} />
    </div>
  );
};

export default RestaurantOwnerLayout;