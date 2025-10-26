import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Utensils, Loader2, AlertTriangle, ArrowLeft, DollarSign, Compass, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import AppHeader from '@/components/Header';
import { formatDistance } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  const type = queryParams.get('type') || 'restaurant';
  const distance = queryParams.get('distance');
  const minPrice = queryParams.get('minPrice');
  const maxPrice = queryParams.get('maxPrice');

  useEffect(() => {
    if (!lat || !lng) {
      setError("Localização não especificada.");
      setIsLoading(false);
      return;
    }
    
    // Se a busca for por pratos, usamos a função RPC search_menu_items
    if (type === 'dish') {
        // NOTE: A busca por pratos não usa distância, mas sim a query de texto
        const fetchDishResults = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase.rpc('search_menu_items', {
                    search_query: query || null,
                    p_limit: 50,
                });
                
                if (error) throw error;
                
                // Mapeia os resultados dos pratos para um formato de exibição simples
                const dishResults = data.map(item => ({
                    id: item.item_id,
                    name: item.item_name,
                    description: item.item_description,
                    price: item.item_price,
                    image_url: item.item_image_url,
                    restaurant_name: item.restaurant_name,
                    restaurant_id: item.restaurant_id,
                }));
                
                // Para simplificar a exibição nesta página, vamos apenas mostrar que a busca de pratos foi feita.
                // Em uma implementação completa, teríamos um componente de lista de pratos.
                setResults(dishResults as any); // Usando 'any' temporariamente para compatibilidade
                
            } catch (err) {
                console.error("Erro ao buscar pratos:", err);
                setError("Não foi possível carregar os resultados dos pratos.");
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDishResults();
        return;
    }

    // Busca por Restaurantes (Padrão)
    const fetchRestaurantResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const maxDistanceKm = distance ? parseFloat(distance) : 10; // Padrão 10km
        
        const { data, error } = await supabase.rpc('find_nearby_restaurants', {
          user_lat: parseFloat(lat),
          user_lng: parseFloat(lng),
          max_distance_km: maxDistanceKm,
          search_query: query || null,
        });

        if (error) {
          throw error;
        }

        setResults(data || []);
      } catch (err) {
        console.error("Erro ao buscar restaurantes:", err);
        setError("Não foi possível carregar os resultados. Tente ajustar sua localização ou filtros.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantResults();
  }, [lat, lng, query, type, distance, minPrice, maxPrice]); // Adicionado todos os parâmetros de busca

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
  
  // Renderização de resultados de pratos (simplificada)
  const renderDishResults = () => (
    <div className="space-y-3">
      {results.map((item: any) => (
        <motion.div
          key={item.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Card 
            className="flex p-3 cursor-pointer hover:bg-gray-50 transition-colors shadow-soft-md border-none rounded-xl"
            onClick={() => navigate(createPageUrl('menuItemDetails', { itemId: item.id }))}
          >
            <img 
              src={item.image_url || PLACEHOLDER_IMAGE_URL} 
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg mr-4 shrink-0"
            />
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <h3 className="font-bold text-lg text-primary truncate">{item.name}</h3>
              <p className="text-sm text-gray-600 mt-1 truncate">
                {item.description}
              </p>
              <p className="text-sm text-highlight font-bold mt-1">
                R$ {item.price.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Em: {item.restaurant_name}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // Renderização de resultados de restaurantes
  const renderRestaurantResults = () => (
    <div className="space-y-3">
      {results.map((r) => (
        <motion.div
          key={r.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Card 
            className="flex p-3 cursor-pointer hover:bg-gray-50 transition-colors shadow-soft-md border-none rounded-xl"
            onClick={() => handleRestaurantClick(r.id)}
          >
            <img 
              src={r.image_url || PLACEHOLDER_IMAGE_URL} 
              alt={r.name}
              className="w-20 h-20 object-cover rounded-lg mr-4 shrink-0"
            />
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-primary truncate">{r.name}</h3>
                {getPlanBadge(r.plan)}
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <Utensils className="w-3 h-3 text-highlight" /> {r.category || 'Geral'}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-highlight" /> {formatDistance(r.distance_km)}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <AppHeader 
        title="Resultados da Busca" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
      />

      <main className="p-4 space-y-4">
        <div className="bg-white p-3 rounded-xl shadow-soft-md border border-gray-200">
          <p className="text-sm text-gray-600 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            Buscando perto de: <span className="font-semibold ml-1 truncate">{decodeURIComponent(address || 'Sua Localização')}</span>
          </p>
          {query && (
            <p className="text-sm text-gray-600 mt-1 flex items-center">
              <Search className="w-4 h-4 mr-2 text-primary" />
              Termo: <span className="font-semibold ml-1 truncate">{query}</span>
            </p>
          )}
          {distance && (
            <p className="text-sm text-gray-600 mt-1 flex items-center">
              <Compass className="w-4 h-4 mr-2 text-primary" />
              Distância Máx: <span className="font-semibold ml-1 truncate">{distance} km</span>
            </p>
          )}
          {(minPrice || maxPrice) && (
            <p className="text-sm text-gray-600 mt-1 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-primary" />
              Preço: <span className="font-semibold ml-1 truncate">R${minPrice || '0'} - R${maxPrice || 'Max'}</span>
            </p>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-xl flex items-center shadow-soft-md">
            <AlertTriangle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        {!isLoading && !error && results.length === 0 && (
          <div className="p-6 text-center bg-white rounded-xl shadow-soft-md">
            <p className="text-lg font-semibold text-gray-700">Nenhum {type === 'dish' ? 'prato' : 'restaurante'} encontrado.</p>
            <p className="text-sm text-gray-500 mt-2">Tente ajustar sua localização ou termo de busca.</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          type === 'dish' ? renderDishResults() : renderRestaurantResults()
        )}
      </main>
    </div>
  );
}