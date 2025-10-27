import React from 'react';
import { Outlet } from 'react-router-dom';
import RestaurantBottomNav from './RestaurantBottomNav';
import { useRestaurantContext } from '@/context/RestaurantContext';

/**
 * Layout principal para a área do restaurante (rotas /restaurant-area/*).
 * Garante que o BottomNav esteja presente.
 */
export default function RestaurantLayout() {
  const { restaurant, isLoading } = useRestaurantContext();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  const isPremium = restaurant?.plan === 'premium' || false;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Outlet />
      <RestaurantBottomNav isPremium={isPremium} />
    </div>
  );
}