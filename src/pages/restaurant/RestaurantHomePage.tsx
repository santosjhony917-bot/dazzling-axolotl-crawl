import React from 'react';
import { useAuthData } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import HomeClientPage from '@/pages/Home'; // A página Home do cliente
import RestaurantDashboardPage from './RestaurantDashboardPage'; // O dashboard de gerenciamento

/**
 * Esta página é o ponto de entrada para /restaurant-area/home.
 * Ela decide qual tela mostrar com base no plano do restaurante.
 */
const RestaurantHomePage: React.FC = () => {
  const { restaurant, isLoading } = useAuthData();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Se o restaurante for Free, ele vê a tela de busca do cliente (Home.tsx)
  if (restaurant?.plan === 'free') {
    // Renderiza a página Home do cliente.
    // Nota: O layout (bottom nav) é tratado pelo RestaurantAreaLayout/SharedLayoutWrapper.
    return <HomeClientPage />;
  }
  
  // Se for Premium ou Basic, ele vê o dashboard de gerenciamento
  return <RestaurantDashboardPage />;
};

export default RestaurantHomePage;