import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, Loader2, Utensils, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNearbyRestaurants, RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils/url';
import { useAuthData } from '@/context/AuthContext'; // Importar useAuthData

const RestaurantResults: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData(); // Usar useAuthData para verificar autenticação

  const queryParams = new URLSearchParams(location.search);
  const initialLat = parseFloat(queryParams.get('lat') || '0');
  const initialLng = parseFloat(queryParams.get('lng') || '0');
  const initialDistance = parseFloat(queryParams.get('distance') || '10');
  const initialSearch = queryParams.get('search') || '';

  const [userLat, setUserLat] = useState<number | null>(initialLat);
  const [userLon, setUserLon] = useState<number | null>(initialLng);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [distance, setDistance] = useState<number>(initialDistance);

  const {
    data: restaurants,
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: userLat !== null && userLon !== null,
    searchQuery: searchQuery,
  });

  useEffect(() => {
    // Atualiza os estados se os query params mudarem
    setUserLat(parseFloat(queryParams.get('lat') || '0'));
    setUserLon(parseFloat(queryParams.get('lng') || '0'));
    setDistance(parseFloat(queryParams.get('distance') || '10'));
    setSearchQuery(queryParams.get('search') || '');
  }, [location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/restaurant-results?lat=${userLat}&lng=${userLon}&distance=${distance}&search=${searchQuery}`);
    refetchRestaurants();
  };

  const handleItemClick = (id: string, type: 'restaurant' | 'menuItem') => {
    if (type === 'restaurant') {
      navigate(createPageUrl('restaurantProfile', { restaurantId: id }));
    }
    // Futuramente, pode-se adicionar navegação para detalhes de item de menu
  };

  return (
    <div className="bg-[#f5f7f8] min-h-screen">
      <header className="bg-white p-4 shadow-soft-md sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-extrabold text-[#022D68] tracking-tight">Resultados da Busca</h1>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar por prato ou restaurante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-12 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-md"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            variant="highlight"
            className="h-12 w-12 rounded-xl shrink-0 bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
          >
            <Search className="w-5 h-5" />
          </Button>
        </form>
      </header>

      <main className="p-4 space-y-4">
        {isRestaurantsLoading ? (
          <>
            <Skeleton className="w-full h-28 rounded-xl" />
            <Skeleton className="w-full h-28 rounded-xl" />
            <Skeleton className="w-full h-28 rounded-xl" />
          </>
        ) : restaurantsError ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md">
            <p className="font-semibold">Erro ao carregar restaurantes:</p>
            <p>{restaurantsError.message}</p>
            <Button onClick={() => refetchRestaurants()} className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        ) : restaurants && restaurants.length > 0 ? (
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => handleItemClick(restaurant.id, 'restaurant')}
                // isFavorite={isAuthenticated} // Removido: isFavorite não é mais uma prop válida
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
            <p className="mt-2">Tente ajustar sua localização ou filtros de busca.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default RestaurantResults;