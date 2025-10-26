import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Utensils, Search, Frown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { useAuthContext } from '@/context/AuthContext';

// O tipo retornado pelo RPC find_nearby_restaurants é uma combinação de Restaurant + distance_km
interface RestaurantResult extends Restaurant {
  distance_km: number;
}

export default function RestaurantResults() {
  const [results, setResults] = useState<RestaurantResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { signOut } = useAuthContext(); 
  const navigate = useNavigate();

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const query = searchParams.get('query');

  useEffect(() => {
    if (!lat || !lng) {
      setError("Localização inválida. Por favor, volte e defina sua localização.");
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('find_nearby_restaurants', {
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          search_query: query || null,
          max_distance_km: 10, // Default search radius
        });

        if (error) {
          throw new Error(error.message);
        }

        setResults(data as RestaurantResult[]);
      } catch (err) {
        console.error("Error fetching restaurant results:", err);
        setError("Não foi possível carregar os resultados. Tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [lat, lng, query]);

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <Frown className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Erro na Busca</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para a Busca
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-primary">
        Resultados da Busca {query && `para "${query}"`}
      </h1>
      <p className="text-sm text-gray-600">
        {results.length} restaurantes encontrados em até 10km.
      </p>

      {results.length === 0 ? (
        <div className="p-6 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum restaurante encontrado</h2>
          <p className="text-gray-600 mb-6">Tente ajustar sua localização ou termos de busca.</p>
          <Button onClick={() => navigate(createPageUrl('index'))}>
            Nova Busca
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((r) => (
            <Card 
              key={r.id} 
              className="flex p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleRestaurantClick(r.id)}
            >
              <img 
                src={r.image_url || PLACEHOLDER_IMAGE_URL} 
                alt={r.name} 
                className="w-20 h-20 object-cover rounded-lg mr-4 shrink-0"
              />
              <div className="flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">{r.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Utensils className="w-3 h-3" /> {r.category || 'Geral'}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {r.distance_km.toFixed(1)} km
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}