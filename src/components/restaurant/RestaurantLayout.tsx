import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import RestaurantBottomNav from './RestaurantBottomNav';

const RestaurantLayout: React.FC = () => {
  const { isPremium } = useAuthContext();
  const isFree = !isPremium;

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <Outlet />
      <RestaurantBottomNav selectedTab="home" isFree={isFree} />
    </div>
  );
};

export default RestaurantLayout;