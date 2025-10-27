import React from 'react';
import { Outlet } from 'react-router-dom';
import RestaurantBottomNav from './RestaurantBottomNav';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { Loader2 } from 'lucide-react';

const RestaurantLayout: React.FC = () => {
  const { restaurant, isLoading } = useRestaurantContext();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center p-8">
        <h1 className="text-xl font-bold text-red-500">Restaurante não encontrado ou não autorizado.</h1>
        <p className="text-gray-600">Verifique se você está logado e se possui um restaurante cadastrado.</p>
      </div>
    );
  }

  const isFree = restaurant.plan === 'free';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar is handled by ProfileManagementLayout, this is the main container */}
      <Outlet />
      <RestaurantBottomNav />
    </div>
  );
};

export default RestaurantLayout;