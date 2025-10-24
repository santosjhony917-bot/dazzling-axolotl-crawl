import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, MapPin, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import RestaurantCard from '@/components/restaurant/RestaurantCard'; // Corrigido: Importação default
import { Restaurant } from '@/types/restaurant';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import Header from '@/components/Header';

export default function RestaurantSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  // Corrigido: Usando isLoading e refetch conforme definido no hook
  const { location, isLoading: loadingLocation, refetch: fetchLocation } = useUserSearchLocation();

  const userLat = location?.latitude;
  const userLng = location?.longitude;
  const currentAddress = location?.address || "Localização Padrão (João Pessoa)";

  const fetchRestaurants = useCallback(async (lat: number, lng: number, query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: lat,
        user_lng: lng,
        max_distance_km: 10, // Padrão de 10km
        search_query: query.length > 0 ? query : null,
      });

      if (error) {
        console.error('Error fetching nearby restaurants:', error);
        setRestaurants([]);
      } else {
        setRestaurants(data || []);
      }
    } catch (e) {
      console.error('Exception fetching nearby restaurants:', e);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch or fetch when location changes
  useEffect(() => {
    if (userLat && userLng) {
      fetchRestaurants(userLat, userLng, searchQuery);
    }
  }, [userLat, userLng, fetchRestaurants]);

  // Handle search input change with debounce
  useEffect(() => {
    if (userLat && userLng) {
      const handler = setTimeout(() => {
        fetchRestaurants(userLat, userLng, searchQuery);
      }, 500); // Debounce time

      return () => {
        clearTimeout(handler);
      };
    }
  }, [searchQuery, userLat, userLng, fetchRestaurants]);

  const handleLocationSaved = () => {
    // Refetch location and restaurants after saving
    fetchLocation();
  };

  return (
    <div className="max-w-md mx-auto bg-[#f5f7f8] min-h-screen">
      <Header 
        title="Buscar Restaurantes" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }} 
      />

      <div className="p-4">
        {/* Localização Atual */}
        <div 
          className="flex items-center justify-between p-3 bg-white rounded-xl shadow-md mb-4 cursor-pointer border border-primary/10"
          onClick={() => setIsLocationModalOpen(true)}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-highlight" />
            <span className="text-sm font-medium text-primary truncate">
              {loadingLocation ? "Carregando localização..." : currentAddress}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-highlight hover:bg-highlight/10">
            Mudar
          </Button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Pesquisar por nome do restaurante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-full text-base focus:border-highlight focus:ring-highlight"
          />
        </div>

        {/* Resultados */}
        <h2 className="text-lg font-bold mb-3 text-primary">
          {searchQuery ? `Resultados para "${searchQuery}"` : "Restaurantes Próximos"}
        </h2>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : restaurants.length > 0 ? (
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant} 
                onClick={() => navigate(`/restaurant/${restaurant.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-white rounded-xl shadow-md">
            <p className="text-gray-500">Nenhum restaurante encontrado na área de 10km.</p>
            <p className="text-sm text-gray-400 mt-2">Tente mudar sua localização de busca.</p>
          </div>
        )}
      </div>

      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={currentAddress}
        onLocationSaved={handleLocationSaved}
      />
    </div>
  );
}