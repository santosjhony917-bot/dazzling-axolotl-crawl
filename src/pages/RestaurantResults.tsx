import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Utensils, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import AppHeader from '@/components/Header';
import { formatDistance } from '@/lib/utils';

// Tipo que a função find_nearby_restaurants retorna
interface RestaurantResult {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  distance_km: number;
  plan: Restaurant['plan'];
}

const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/150?text=Restaurante';

export default function RestaurantResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState<RestaurantResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = new URLSearchParams(location.search);
  const lat = queryParams.get('lat');
  const lng = queryParams.get('lng');
  const query = queryParams.get('query');
  const address = queryParams.get('address');

  useEffect(() => {
    if (!lat || !lng) {
      setError("Localização não especificada.");
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
        });

        if (error) {
          throw error;
        }

        setResults(data || []);
      } catch (err) {
        console.error("Erro ao buscar restaurantes:", err);
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

  const getPlanBadge = (plan: Restaurant['plan']) => {
    switch (plan) {
      case 'premium':
        return <span className="text-xs font-semibold bg-yellow-500 text-white px-2 py-0.5 rounded-full">Premium</span>;
      case 'basic':
        return <span className="text-xs font-semibold bg-blue-500 text-white px-2 py-0.5 rounded-full">Básico</span>;
      case 'premium_gift':
        return <span className="text-xs font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full">Cortesia</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <AppHeader 
        title="Resultados da Busca" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
      />

      <main className="p-4 space-y-4">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            Buscando perto de: <span className="font-semibold ml-1 truncate">{address || 'Sua Localização'}</span>
          </p>
          {query && (
            <p className="text-sm text-gray-600 mt-1 flex items-center">
              <Utensils className="w-4 h-4 mr-2 text-primary" />
              Termo: <span className="font-semibold ml-1 truncate">{query}</span>
            </p>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        {!isLoading && !error && results.length === 0 && (
          <div className="p-6 text-center bg-white rounded-lg shadow-sm">
            <p className="text-lg font-semibold text-gray-700">Nenhum restaurante encontrado.</p>
            <p className="text-sm text-gray-500 mt-2">Tente ajustar sua localização ou termo de busca.</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
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
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{r.name}</h3>
                    {getPlanBadge(r.plan)}
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Utensils className="w-3 h-3" /> {r.category || 'Geral'}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {formatDistance(r.distance_km)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}