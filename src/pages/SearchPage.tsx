import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useUserLocation } from '@/hooks/useUserLocation';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Restaurant } from '@/types';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

const PAGE_SIZE = 10;

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const { location, isLoading: isLocationLoading, error: locationError } = useUserLocation();
  const { toast } = useToast();

  const userLat = location?.latitude;
  const userLng = location?.longitude;

  const fetchRestaurants = useCallback(async (currentOffset: number, isNewSearch: boolean) => {
    if (isLoading || isLocationLoading || !userLat || !userLng) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: userLat,
        user_lng: userLng,
        search_query: query || null,
        p_limit: PAGE_SIZE,
        p_offset: currentOffset,
      });

      if (error) {
        throw error;
      }

      const newResults = data || [];
      
      if (isNewSearch) {
        setSearchResults(newResults);
      } else {
        // Concatenate new results to existing ones
        setSearchResults(prevResults => [...prevResults, ...newResults]);
      }

      setHasMore(newResults.length === PAGE_SIZE);
      setOffset(currentOffset + newResults.length);

    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast({
        title: 'Erro na Busca',
        description: 'Não foi possível carregar os restaurantes. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, userLat, userLng, isLocationLoading, toast, isLoading]);

  // Effect to handle initial load or query change
  useEffect(() => {
    if (userLat && userLng) {
      // Reset offset and perform a new search
      setOffset(0);
      fetchRestaurants(0, true);
    }
  }, [query, userLat, userLng, fetchRestaurants]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The useEffect hook handles the actual fetching when 'query' changes
    // We just need to ensure the state is updated if the user types and submits
    // If the query hasn't changed, we force a refresh by calling fetchRestaurants(0, true)
    if (offset > 0 || searchResults.length > 0) {
        setOffset(0);
        fetchRestaurants(0, true);
    }
  };

  const handleLoadMore = () => {
    // Use the current offset state to fetch the next page
    fetchRestaurants(offset, false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const renderContent = () => {
    if (isLocationLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Localizando você...</p>
        </div>
      );
    }

    if (locationError || !userLat || !userLng) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-red-500">
          <MapPin className="w-8 h-8 mb-4" />
          <p>Não foi possível obter sua localização. A busca por proximidade está desativada.</p>
        </div>
      );
    }

    if (searchResults.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <Search className="w-8 h-8 mb-4" />
          <p>Nenhum restaurante encontrado para "{query || 'sua busca'}" nas proximidades.</p>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-4">
          {searchResults.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <Button 
              onClick={handleLoadMore} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Ver Mais'
              )}
            </Button>
          </div>
        )}
        
        {/* Show loading indicator if loading more results */}
        {!hasMore && searchResults.length > 0 && (
            <p className="text-center text-sm text-gray-500 mt-6">Fim dos resultados.</p>
        )}
      </>
    );
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Busca</h1>
      
      <form onSubmit={handleSearch} className="flex space-x-2 mb-6">
        <Input
          type="text"
          placeholder="Buscar restaurantes ou categorias..."
          value={query}
          onChange={handleInputChange}
          className="flex-grow"
        />
        <Button type="submit" disabled={isLoading || isLocationLoading}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <Separator className="mb-6" />

      {renderContent()}
      
      {/* This loading indicator is for the initial load only if searchResults is empty */}
      {isLoading && searchResults.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Buscando resultados...</p>
        </div>
      )}
    </div>
  );
}