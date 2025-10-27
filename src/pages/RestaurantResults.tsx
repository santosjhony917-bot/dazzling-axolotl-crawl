import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase';
import { fetchNearbyRestaurants } from '@/integrations/supabase/restaurants';
import { Card } from '@/components/ui/card';
import { Loader2, Search, MapPin, AlertTriangle, Utensils, ArrowLeft } from 'lucide-react'; // Importado ArrowLeft
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { formatDistance } from '@/lib/utils';

const RestaurantResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const userLat = parseFloat(searchParams.get('lat') || '0');
  const userLon = parseFloat(searchParams.get('lng') || '0');
  const maxDistance = parseInt(searchParams.get('distance') || '10');
  const searchQuery = searchParams.get('query') || '';
  const address = searchParams.get('address') || 'Localização Desconhecida';

  const { data: restaurants, isLoading, error } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['restaurantResults', userLat, userLon, maxDistance, searchQuery],
    queryFn: () => fetchNearbyRestaurants(userLat, userLon, maxDistance, searchQuery),
    enabled: userLat !== 0 && userLon !== 0,
  });

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId }));
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      <Header 
        title="Resultados da Busca"
        leftAction={{ icon: ArrowLeft, onClick: handleBack }}
      />
      
      <div className="p-4 space-y-4">
        <Card className="p-4 shadow-soft-md border-none rounded-xl">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-highlight" />
            <p className="truncate">Buscando perto de: <span className="font-semibold">{address}</span></p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Search className="w-4 h-4 text-highlight" />
            <p className="truncate">Filtros: {searchQuery || 'Todos'} | {maxDistance} km</p>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary">
              {restaurants?.length || 0} Restaurantes Encontrados
            </h2>
            {restaurants && restaurants.length > 0 ? (
              restaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                  isFavorite={isAuthenticated} // Mock de favorito
                />
              ))
            ) : (
              <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-semibold">Nenhum resultado</p>
                <p className="mt-2">Tente uma busca mais ampla ou ajuste a distância.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantResultsPage;