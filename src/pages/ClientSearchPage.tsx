import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Loader2, Utensils, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ClientLayout from '@/components/ClientLayout';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';

const ClientSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading } = useUserSearchLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');

  const userLat = location.latitude;
  const userLon = location.longitude;

  const { 
    restaurants, 
    loading: isRestaurantsLoading, 
    error: restaurantsError, 
    refetch: refetchRestaurants 
  } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: userLat !== null && userLon !== null,
    searchQuery: currentSearch,
  });

  useEffect(() => {
    if (restaurantsError) {
      showError(restaurantsError);
    }
  }, [restaurantsError]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localização ou defina-a manualmente.");
      return;
    }
    setCurrentSearch(searchQuery);
    refetchRestaurants();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const isLoading = isLocationLoading || isRestaurantsLoading;

  return (
    <ClientLayout selectedTab="search">
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="text-primary hover:bg-primary/5"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-primary">Buscar</h1>
        </div>
        
        {/* Barra de Busca */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar pratos ou restaurantes..."
              className="w-full pl-10 h-12 text-base rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" size="icon" variant="highlight" className="h-12 w-12 rounded-full shrink-0">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </Button>
        </form>
        
        {/* Filtros Rápidos (Placeholder) */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Button variant="outline" size="sm" className="rounded-full text-sm">
            <Filter className="w-4 h-4 mr-1" /> Categoria
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-sm">
            <Filter className="w-4 h-4 mr-1" /> Preço
          </Button>
          <Button variant="outline" size="sm" className="rounded-full text-sm">
            <Filter className="w-4 h-4 mr-1" /> Distância
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <h2 className="text-xl font-bold text-[#022D68]">
          {currentSearch ? `Resultados para "${currentSearch}"` : "Restaurantes Próximos"}
        </h2>
        
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-48 rounded-xl" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
        ) : restaurantsError ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">Erro ao carregar resultados:</p>
            <p>{restaurantsError}</p>
            <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
          </div>
        ) : restaurants.length > 0 ? (
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant} 
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-600">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum resultado encontrado</p>
            <p className="mt-2">Tente refinar sua busca ou ajustar os filtros.</p>
          </div>
        )}
      </main>
    </ClientLayout>
  );
};

export default ClientSearchPage;