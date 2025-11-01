"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicRestaurantData } from '@/integrations/supabase/restaurants';
import { useAuth } from '@/hooks/useAuth';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';

const RestaurantProfilePublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const restaurantId = slug; // Assuming slug is the restaurant ID for now

  const { data, isLoading, error } = useQuery<PublicRestaurantData | null>({
    queryKey: ['publicRestaurant', restaurantId, user?.id],
    queryFn: () => fetchPublicRestaurantData(restaurantId!, user?.id),
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Não foi possível carregar o perfil do restaurante. Verifique o ID ou tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const restaurant = data;

  // The useFavoriteToggle hook handles the reactive state of is_favorite, 
  // so we pass the fetched data as initial data.
  const layoutProps = {
    initialRestaurantData: restaurant,
  };

  // Determine which layout to use based on the plan
  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';

  return (
    <>
      {isPremium ? (
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </>
  );
};

export default RestaurantProfilePublic;