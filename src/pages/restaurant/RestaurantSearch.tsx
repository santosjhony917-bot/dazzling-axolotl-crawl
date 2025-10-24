import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Restaurant } from '@/types';
import Header from '@/components/Header';
import SearchToggle from '@/components/SearchToggle';
import { NearbyRestaurant } from '@/hooks/useNearbyRestaurants'; // Importando o tipo correto

type SearchType = 'dishes' | 'restaurants';

export default function RestaurantSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]); // Usando NearbyRestaurant
  const [searchType, setSearchType] = useState<SearchType>('restaurants');
  
  const { location } = useUserSearchLocation();

  const userLat = location?.latitude;
  const userLng = location?.longitude;
  const currentAddress = location?.address || "Localização Padrão (João Pessoa)";

  const fetchRestaurants = useCallback(async (lat: number, lng: number, query: string) => {
    if (searchType === 'dishes') {
      // TODO: Implementar busca de pratos
      setRestaurants([]);
      setLoading(false);
      return;
    }

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
        setRestaurants(data as NearbyRestaurant[] || []); // Asserção de tipo para NearbyRestaurant[]
      }
    } catch (e) {
      console.error('Exception fetching nearby restaurants:', e);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  // Initial fetch or fetch when location changes or searchType changes
  useEffect(() => {
    if (userLat && userLng) {
      fetchRestaurants(userLat, userLng, searchQuery);
    }
  }, [userLat, userLng, fetchRestaurants, searchType]);

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
  }, [searchQuery, userLat, userLng, fetchRestaurants, searchType]);

  const handleToggleSearch = (type: SearchType) => {
    setSearchType(type);
    setSearchQuery(''); // Limpa a busca ao trocar o tipo
  };

  return (
    <div className="max-w-md mx-auto bg-[#f5f7f8] min-h-screen">
      <Header 
        title="Buscar Restaurantes" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }} 
      />

      <div className="p-4">
        {/* Barra de Pesquisa */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder={`Pesquisar por ${searchType === 'dishes' ? 'prato' : 'restaurante'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-full text-base focus:border-highlight focus:ring-highlight"
          />
        </div>
        
        {/* Toggle de Busca */}
        <SearchToggle activeType={searchType} onToggle={handleToggleSearch} />

        {/* Resultados */}
        <h2 className="text-lg font-bold mb-3 text-primary">
          {searchQuery 
            ? `Resultados para "${searchQuery}" em ${searchType === 'dishes' ? 'Pratos' : 'Restaurantes'}` 
            : `${searchType === 'dishes' ? 'Pratos' : 'Restaurantes'} Próximos`}
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
            <p className="text-gray-500">
              Nenhum {searchType === 'dishes' ? 'prato' : 'restaurante'} encontrado na área de 10km.
            </p>
            {/* Removendo a exibição da localização aqui também, pois não deve ser visível */}
            {/* <p className="text-sm text-gray-400 mt-2">A busca está baseada em: {currentAddress}</p> */}
          </div>
        )}
      </div>
    </div>
  );
}