import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RestaurantWithDistance } from '@/types/supabase';
import { fetchNearbyRestaurants } from '@/integrations/supabase/restaurants'; // Corrected import
import { Card } from '@/components/ui/card';
import { Loader2, Search, MapPin, AlertTriangle, Utensils, ArrowLeft, Pizza } from 'lucide-react';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import Header from '@/components/Header';
import { useAuthData } from '@/context/AuthContext';
import { useSearchItems, SearchItemResult } from '@/hooks/useSearchItems'; // Importando hook de busca de itens
import SearchItemCard from '@/components/search/SearchItemCard'; // Componente para exibir itens

const RestaurantResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData();

  const userLat = parseFloat(searchParams.get('lat') || '0');
  const userLon = parseFloat(searchParams.get('lng') || '0');
  const maxDistance = parseInt(searchParams.get('distance') || '10');
  const searchQuery = searchParams.get('query') || '';
  const searchType = searchParams.get('type') || 'restaurant'; // 'restaurant' ou 'dish'
  const address = searchParams.get('address') || 'Localização Desconhecida';

  // --- Busca de Restaurantes ---
  const { data: restaurants, isLoading: isRestaurantLoading, error: restaurantError } = useQuery<RestaurantWithDistance[], Error>({
    queryKey: ['restaurantResults', userLat, userLon, maxDistance, searchQuery],
    queryFn: () => fetchNearbyRestaurants(userLat, userLon, maxDistance, searchQuery),
    enabled: searchType === 'restaurant' && userLat !== 0 && userLon !== 0,
  });
  
  // --- Busca de Itens (Pratos) ---
  const { items: dishes, loading: isDishLoading, error: dishError } = useSearchItems({
    searchQuery: searchQuery,
    enabled: searchType === 'dish',
  });

  const isLoading = searchType === 'restaurant' ? isRestaurantLoading : isDishLoading;
  const currentError = searchType === 'restaurant' ? restaurantError : dishError;
  
  const handleItemClick = (id: string, type: 'dish' | 'restaurant') => {
    if (type === 'restaurant') {
      navigate(createPageUrl('restaurantProfile', { restaurantId: id }));
    } else {
      navigate(createPageUrl('menuItemDetails', { itemId: id }));
    }
  };

  const handleBack = () => navigate(-1);

  const resultsCount = searchType === 'restaurant' ? (restaurants?.length || 0) : (dishes?.length || 0);
  const resultTitle = searchType === 'restaurant' ? 'Restaurantes Encontrados' : 'Pratos Encontrados';
  const ResultIcon = searchType === 'restaurant' ? Utensils : Pizza;

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
            <p className="truncate">Local: <span className="font-semibold">{address}</span></p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Search className="w-4 h-4 text-highlight" />
            <p className="truncate">Busca por: <span className="font-semibold">{searchQuery || 'Todos'}</span> em <span className="font-semibold">{searchType === 'restaurant' ? 'Restaurantes' : 'Pratos'}</span></p>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : currentError ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="font-semibold">Erro ao carregar resultados:</p>
            {/* Acessa a mensagem de erro de forma segura */}
            <p>{currentError instanceof Error ? currentError.message : "Erro desconhecido."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-primary">
              {resultsCount} {resultTitle}
            </h2>
            
            {resultsCount > 0 ? (
              searchType === 'restaurant' ? (
                // Exibe Restaurantes
                <div className="space-y-4">
                  {restaurants?.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onClick={() => handleItemClick(restaurant.id, 'restaurant')}
                      isFavorite={isAuthenticated}
                    />
                  ))}
                </div>
              ) : (
                // Exibe Pratos
                <div className="space-y-4">
                  {dishes?.map((dish) => (
                    <SearchItemCard
                      key={dish.item_id}
                      item={{
                        id: dish.item_id,
                        name: dish.item_name,
                        description: dish.item_description,
                        price: dish.item_price,
                        imageUrl: dish.item_image_url,
                        type: 'dish',
                        category: dish.restaurant_category,
                        city: dish.restaurant_name, // Usando o nome do restaurante como cidade temporariamente
                      }}
                      onClick={(id) => handleItemClick(id, 'dish')}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
                <ResultIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-semibold">Nenhum resultado encontrado</p>
                <p className="mt-2">Tente uma busca mais ampla ou ajuste os filtros.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantResultsPage;