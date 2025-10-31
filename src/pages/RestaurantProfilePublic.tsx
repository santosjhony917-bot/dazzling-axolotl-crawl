import React from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Loader2 } from 'lucide-react';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Button } from '@/components/ui/button';

const RestaurantProfilePublic: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { data: restaurant, isLoading, error } = useRestaurantProfile(restaurantId!);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao Carregar Perfil</h1>
        <p className="text-gray-600 mb-6">O restaurante que você está procurando não foi encontrado ou houve um erro de conexão.</p>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    );
  }

  // Renderiza o layout Premium se o plano for 'premium'
  {/* Erro 4 corrigido: Removendo 'premium_gift' que não é um tipo válido de RestaurantPlan */}
  return restaurant.plan === 'premium' ? (
        <PremiumProfileLayout restaurant={restaurant} />
      ) : (
        <FreeProfileLayout restaurant={restaurant} />
      );
};

export default RestaurantProfilePublic;