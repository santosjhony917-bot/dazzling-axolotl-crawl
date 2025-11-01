"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicRestaurantData } from '@/integrations/supabase/restaurants';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { Button } from '@/components/ui/button';

const FullMenuPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const restaurantId = slug;

  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData | null>({
    queryKey: ['publicRestaurant', restaurantId, user?.id],
    queryFn: () => fetchPublicRestaurantData(restaurantId!, user?.id),
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Não foi possível carregar o cardápio. Verifique o ID ou tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to={`/r/${restaurantId}`}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar ao Perfil
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-900 truncate flex-1 text-center ml-[-100px] sm:ml-0">
            Cardápio Completo: {restaurant.name}
          </h1>
          <div className="w-[100px] hidden sm:block"></div> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {hasMenu ? (
          <RestaurantMenu 
            menuCategories={restaurant.menu_categories} 
            isFullMenuPage={true} // Nova prop para indicar que é a página completa
          />
        ) : (
          <p className="text-center text-gray-500 p-8">Nenhum item de menu disponível.</p>
        )}
      </main>
    </div>
  );
};

export default FullMenuPage;