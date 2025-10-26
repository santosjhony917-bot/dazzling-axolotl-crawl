import React from 'react';
import { Utensils } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';

const RestaurantHome: React.FC = () => {
  const { isPremium } = useUserRole();

  return (
    <div className="min-h-screen bg-[#f5f7f8] p-4 pb-20 max-w-md mx-auto">
      <header className="pt-8 pb-6 text-center">
        <h1 className="text-3xl font-bold text-[#022D68]">Painel do Restaurante</h1>
        <p className="text-gray-600 mt-1">Bem-vindo de volta!</p>
      </header>
      
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-soft-lg p-6 border-none">
        <Utensils className="w-12 h-12 text-[#E47948] mb-4" />
        <p className="text-lg text-gray-700">Visão geral do seu negócio.</p>
        <p className="text-sm text-gray-500 mt-2">Funcionalidades em desenvolvimento.</p>
      </div>
    </div>
  );
};

export default RestaurantHome;