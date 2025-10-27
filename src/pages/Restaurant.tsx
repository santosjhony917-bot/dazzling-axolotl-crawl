import React from 'react';
import { useParams } from 'react-router-dom';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { useRestaurantById } from '@/hooks/useRestaurantById';
import { Loader2 } from 'lucide-react';

const RestaurantPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { restaurant, isLoading, error } = useRestaurantById(id);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="text-center p-8">
        <h1 className="text-xl font-bold text-red-500">Erro ao carregar restaurante</h1>
        <p className="text-gray-600">O restaurante com ID {id} não foi encontrado.</p>
      </div>
    );
  }

  // Decide which layout to use based on the plan
  const LayoutComponent = restaurant.plan === 'premium' ? PremiumProfileLayout : FreeProfileLayout;

  return <LayoutComponent restaurant={restaurant} />;
};

export default RestaurantPage;