import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurantPublic } from '@/hooks/useRestaurantPublic';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import BasicProfileLayout from '@/components/public/BasicProfileLayout';
import { toast } from 'react-hot-toast';

const RestaurantProfilePublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant, isLoading, error } = useRestaurantPublic(slug);
  const { user } = useAuth();

  const isOwner = user?.id === restaurant?.user_id;

  useEffect(() => {
    if (error) {
      toast.error("Não foi possível carregar o perfil do restaurante.");
    }
  }, [error]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !restaurant) {
    return <ErrorMessage message="Restaurante não encontrado ou erro ao carregar." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {restaurant.plan === 'premium' || restaurant.plan === 'premium_gift' ? (
        <PremiumProfileLayout restaurant={restaurant} isOwner={isOwner} />
      ) : (
        <BasicProfileLayout restaurant={restaurant} isOwner={isOwner} />
      )}
    </div>
  );
};

export default RestaurantProfilePublic;