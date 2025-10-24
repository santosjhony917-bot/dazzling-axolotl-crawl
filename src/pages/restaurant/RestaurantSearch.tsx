import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import useUserLocation from '@/hooks/useUserLocation';
import RestaurantCard from '@/components/restaurant/RestaurantCard';

// Definindo o tipo de retorno da função Supabase
interface RestaurantResult {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  plan: 'free' | 'basic' | 'premium';
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  distance_km: number;
  category: string | null;
}

const RestaurantSearch: React.FC = () => {
  const [searchType, setSearchType] = useState<'Pratos' | 'Restaurantes'>('Restaurantes');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<RestaurantResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { latitude, longitude, loading: loadingLocation, error: locationError } = useUserLocation();

  const handleSearch = useCallback(async (lat: number, lng: number, query: string) => {
    setLoadingSearch(true);
    setSearchError(null);
    setResults([]);

    try {
      // Chamando a função RPC do Supabase para buscar restaurantes próximos
      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: lat,
        user_lng: lng,
        max_distance_km: 50, // Busca em um raio de 50km
        search_query: query || null,
      });

      if (error) {
        console.error('Erro ao buscar restaurantes:', error);
        setSearchError('Não foi possível carregar os restaurantes. Tente novamente.');
        return;
      }

      setResults(data as RestaurantResult[]);
    } catch (e) {
      console.error('Erro inesperado durante a busca:', e);
      setSearchError('Ocorreu um erro inesperado.');
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  // Efeito para buscar automaticamente quando a localização estiver disponível e o tipo for 'Restaurantes'
  useEffect(() => {
    if (searchType === 'Restaurantes' && latitude !== null && longitude !== null) {
      handleSearch(latitude, longitude, searchTerm);
    }
  }, [searchType, latitude, longitude]); // Dependências: tipo de busca, lat e lng

  // Função para lidar com a busca manual (ex: ao clicar no botão de busca ou digitar)
  const triggerSearch = () => {
    if (searchType === 'Restaurantes' && latitude !== null && longitude !== null) {
      handleSearch(latitude, longitude, searchTerm);
    } else if (searchType === 'Restaurantes' && (loadingLocation || locationError)) {
      setSearchError(locationError || 'Aguardando permissão de localização...');
    }
  };

  const displayLocationStatus = () => {
    if (loadingLocation) return 'Obtendo localização...';
    if (locationError) return 'Localização necessária para busca por proximidade.';
    if (latitude && longitude) return 'Localização obtida.';
    return 'Aguardando localização...';
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-primary dark:text-white">Buscar</h1>

      {/* Barra de Pesquisa */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={`Buscar por ${searchType.toLowerCase()}...`}
            className="pl-10 pr-4 py-2 w-full rounded-full border-gray-300 focus:border-primary focus:ring-primary dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                triggerSearch();
              }
            }}
          />
        </div>
        <button
          onClick={triggerSearch}
          disabled={loadingLocation || loadingSearch || !!locationError}
          className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loadingSearch ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </button>
      </div>

      {/* Status da Localização */}
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
        <MapPin className="w-4 h-4 mr-1" />
        <span>{displayLocationStatus()}</span>
      </div>

      {/* Toggle de Tipo de Busca */}
      <div className="bg-gray-100 dark:bg-zinc-700 p-1 rounded-full flex mb-6 h-10">
        <button
          onClick={() => setSearchType('Pratos')}
          className={`flex h-full flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-bold leading-normal transition-all ${
            searchType === 'Pratos'
              ? 'bg-white dark:bg-zinc-800 text-primary shadow-md'
              : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
          }`}
        >
          Pratos
        </button>
        <button
          onClick={() => setSearchType('Restaurantes')}
          className={`flex h-full flex-1 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-bold leading-normal transition-all ${
            searchType === 'Restaurantes'
              ? 'bg-highlight text-white shadow-md'
              : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
          }`}
        >
          Restaurantes
        </button>
      </div>

      {/* Resultados da Busca */}
      <div className="mt-4">
        {loadingSearch && (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {searchError && (
          <p className="text-center text-red-500 p-4">{searchError}</p>
        )}

        {!loadingSearch && !searchError && searchType === 'Restaurantes' && (
          <>
            {results.length > 0 ? (
              results.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))
            ) : (
              <p className="text-center text-gray-500 p-4">
                {latitude === null || longitude === null
                  ? 'Aguardando localização para buscar restaurantes próximos.'
                  : 'Nenhum restaurante encontrado na sua área.'}
              </p>
            )}
          </>
        )}

        {searchType === 'Pratos' && (
          <p className="text-center text-gray-500 p-4">
            Funcionalidade de busca por pratos ainda não implementada.
          </p>
        )}
      </div>
    </div>
  );
};

export default RestaurantSearch;