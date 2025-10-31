import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import { PremiumProfileLayout } from '@/components/public/PremiumProfileLayout'; // Corrigido: Importação nomeada
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateDistance } from '@/lib/utils';
import { useUserLocation } from '@/hooks/useUserLocation';

const RestaurantProfilePublic: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { location } = useUserLocation();

  useEffect(() => {
    if (!restaurantId) {
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) {
        showError('Erro ao carregar o perfil do restaurante.');
        console.error(error);
        setRestaurant(null);
      } else {
        setRestaurant(data as PublicRestaurantData);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [restaurantId]);

  const fullAddress = useMemo(() => {
    if (!restaurant) return '';
    const parts = [
      restaurant.address,
      restaurant.number,
      restaurant.neighborhood,
      restaurant.city,
      restaurant.state,
      restaurant.cep,
    ].filter(Boolean);
    return parts.join(', ');
  }, [restaurant]);

  const addressSummary = useMemo(() => {
    if (!restaurant) return '';
    const parts = [
      restaurant.address,
      restaurant.number,
      restaurant.neighborhood,
      `${restaurant.city}/${restaurant.state}`,
    ].filter(Boolean);
    return parts.join(', ');
  }, [restaurant]);

  const scheduleDisplay = useMemo(() => {
    // Placeholder for schedule display logic
    return ['Segunda a Sexta: 18:00 - 23:00', 'Sábado e Domingo: 12:00 - 00:00'];
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-64 w-full" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-12 w-48 mx-auto" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Restaurante não encontrado.</p>
      </div>
    );
  }

  // Determine layout based on plan (assuming 'premium' is the only other plan besides 'free')
  const LayoutComponent = restaurant.plan === 'premium' ? PremiumProfileLayout : FreeProfileLayout;

  return (
    <LayoutComponent
      restaurant={restaurant}
      addressSummary={addressSummary}
      scheduleDisplay={scheduleDisplay}
      fullAddress={fullAddress}
    />
  );
};

export default RestaurantProfilePublic;