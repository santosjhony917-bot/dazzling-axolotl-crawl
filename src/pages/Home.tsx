import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, DollarSign, Heart, Utensils, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import RestaurantCard from '@/components/RestaurantCard';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByNameModal from '@/components/search/SearchByNameModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Restaurant } from '@/types/restaurant';
import { findNearbyRestaurants } from '@/integrations/supabase/restaurants';
import { useUserLocation } from '@/hooks/useUserLocation';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils/url';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Home: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { location, isLoading: isLocationLoading, error: locationError, requestLocation } = useUserLocation();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [filter, setFilter] = useState<{ minPrice: number | null, maxPrice: number | null }>({ minPrice: null, maxPrice: null });

  const fetchRestaurants = useCallback(async (lat: number, lng: number, query: string = '') => {
    setIsLoading(true);
    try {
      const data = await findNearbyRestaurants(lat, lng, 10, query);
      setRestaurants(data);
    } catch (err) {
      console.error("Failed to fetch restaurants:", err);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível carregar os restaurantes próximos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (location) {
      fetchRestaurants(location.latitude, location.longitude, searchQuery);
    } else if (!isLocationLoading && !locationError) {
      // If location is not available and not loading, prompt user
      // This case is handled by the useUserLocation hook, but we ensure loading state is set.
      setIsLoading(false);
    }
  }, [location, isLocationLoading, fetchRestaurants, searchQuery]);

  const handleSearch = () => {
    if (location) {
      fetchRestaurants(location.latitude, location.longitude, searchQuery);
    } else {
      toast({
        title: "Localização Necessária",
        description: "Por favor, permita o acesso à sua localização para buscar restaurantes.",
        variant: "default",
      });
    }
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
    setFilter({ minPrice, maxPrice });
    setIsPriceModalOpen(false);
    // Re-fetch restaurants with price filter logic (if implemented in backend)
    // For now, we rely on the search modal handling item search separately.
  };

  const handleClearFilter = () => {
    setFilter({ minPrice: null, maxPrice: null });
    setSearchQuery('');
    if (location) {
      fetchRestaurants(location.latitude, location.longitude, '');
    }
  };

  const handleNavigateToRestaurant = (id: string) => {
    navigate(createPageUrl('restaurant', { id }));
  };

  const handleNavigateToFavorites = () => {
    if (session) {
      navigate(createPageUrl('favorites'));
    } else {
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado para ver seus favoritos.",
        variant: "default",
      });
      navigate(createPageUrl('login'));
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex space-x-4">
            <Skeleton className="w-20 h-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderLocationError = () => (
    <Alert variant="destructive" className="mt-4">
      <MapPin className="h-4 w-4" />
      <AlertTitle>Localização Necessária</AlertTitle>
      <AlertDescription>
        Não foi possível obter sua localização. Por favor, verifique as permissões do seu dispositivo.
        <Button onClick={requestLocation} className="mt-2 w-full">Tentar Novamente</Button>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header e Busca Principal */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-primary dark:text-white">Filter Food</h1>
        <Button variant="ghost" size="icon" onClick={handleNavigateToFavorites}>
          <Heart className="w-6 h-6 text-red-500" />
        </Button>
      </div>

      {/* Localização Atual */}
      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4">
        <MapPin className="w-4 h-4 mr-1 text-highlight" />
        <span>{location ? `Localização: ${location.address || 'Coordenadas GPS'}` : 'Buscando localização...'}</span>
      </div>

      {/* Barra de Busca de Restaurantes */}
      <div className="flex space-x-2 mb-6">
        <Input
          type="text"
          placeholder="Buscar restaurantes por nome ou categoria..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <Button onClick={handleSearch} disabled={isLoading || isLocationLoading}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Ações Rápidas (Busca de Pratos) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button 
          variant="outline" 
          className="flex-shrink-0"
          onClick={() => setIsPriceModalOpen(true)}
        >
          <DollarSign className="w-4 h-4 mr-2" /> Buscar Prato por Preço
        </Button>
        <Button 
          variant="outline" 
          className="flex-shrink-0"
          onClick={() => setIsNameModalOpen(true)}
        >
          <Utensils className="w-4 h-4 mr-2" /> Buscar Prato por Nome
        </Button>
      </div>

      {/* Filtros Ativos (Se houver) */}
      {(filter.minPrice !== null || filter.maxPrice !== null || searchQuery) && (
        <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Filtros Ativos:</span>
          {searchQuery && <Badge variant="secondary">{searchQuery}</Badge>}
          {(filter.minPrice !== null || filter.maxPrice !== null) && (
            <Badge variant="secondary">Preço: {filter.minPrice || '0'} - {filter.maxPrice || 'Max'}</Badge>
          )}
          <Button variant="ghost" size="icon" onClick={handleClearFilter} className="h-6 w-6 ml-auto">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Lista de Restaurantes */}
      <h2 className="text-xl font-bold text-primary dark:text-white mb-4">Restaurantes Próximos</h2>
      
      {isLocationLoading && <p className="text-center text-gray-500">Aguardando permissão de localização...</p>}
      {locationError && renderLocationError()}
      
      {isLoading && !locationError && renderLoadingState()}

      {!isLoading && !locationError && restaurants.length === 0 && (
        <p className="text-center text-gray-500 mt-8">Nenhum restaurante encontrado na sua área.</p>
      )}

      {!isLoading && restaurants.length > 0 && (
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard 
              key={restaurant.id} 
              restaurant={restaurant} 
              onClick={() => handleNavigateToRestaurant(restaurant.id)}
            />
          ))}
        </div>
      )}

      {/* Modais de Busca */}
      <SearchByPriceModal 
        isOpen={isPriceModalOpen} 
        onClose={() => setIsPriceModalOpen(false)}
      />
      <SearchByNameModal 
        isOpen={isNameModalOpen} 
        onClose={() => setIsNameModalOpen(false)}
      />
    </div>
  );
};

export default Home;