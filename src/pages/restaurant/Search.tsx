import React from 'react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { BarChart3 } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useRestaurantContext } from '@/context/RestaurantContext';

/**
 * Página de Análise de Mercado (Busca Unificada para Restaurantes)
 */
export default function RestaurantSearchPage() {
  const { restaurant, isLoading } = useRestaurantContext();
  
  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Carregando...</div>;
  }

  const isPremium = restaurant?.plan === 'premium' || false;

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Análise de Mercado" backPath="restaurant-area/dashboard" />
      
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary mb-4">Busca e Análise</h1>
        <p className="text-gray-600">
          Aqui você pode simular a busca de clientes e analisar o desempenho do seu restaurante.
        </p>
        {/* Conteúdo de busca e análise viria aqui */}
      </div>

      <RestaurantBottomNav isPremium={isPremium} />
    </div>
  );
}