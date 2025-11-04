import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ChevronRight, DollarSign, MapPin } from 'lucide-react';
import SearchToggle from '@/components/SearchToggle';
import SearchItemCard from '@/components/search/SearchItemCard';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from 'use-debounce';
import useUserLocation from '@/hooks/useUserLocation';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

type SearchType = 'dishes' | 'restaurants';

interface MenuItem {
  item_id: string;
  item_name: string;
  item_description: string;
  item_price: number;
  item_image_url: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string;
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  image_url: string;
  cover_image_url: string;
  category: string;
  city: string;
  state: string;
  distance_km: number;
}

const SearchUnifiedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [activeType, setActiveType] = useState<SearchType>('dishes');
  const [searchResults, setSearchResults] = useState<MenuItem[] | Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  // Corrigido: Desestruturando latitude, longitude, loading e error diretamente do hook
  const { latitude, longitude, loading: locationLoading, error: locationError } = useUserLocation();

  const handleToggle = (type: SearchType) => {
    setActiveType(type);
    setSearchResults([]); // Clear results when toggling type
  };

  const handleItemClick = useCallback((itemId: string, type: SearchType) => {
    if (type === 'dishes') {
      // For dishes, we might want to navigate to the restaurant page or a dish detail page
      // For now, let's just log it or navigate to a generic item page
      console.log(`Clicked dish with ID: ${itemId}`);
      // Example: navigate(`/dish/${itemId}`);
    } else {
      // For restaurants, navigate to the restaurant detail page
      console.log(`Clicked restaurant with ID: ${itemId}`);
      navigate(`/restaurant/${itemId}`);
    }
  }, [navigate]);

  const fetchSearchResults = useCallback(async () => {
    if (!debouncedSearchQuery) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let { data, error } = { data: null, error: null };

    if (activeType === 'dishes') {
      ({ data, error } = await supabase.rpc('search_menu_items', {
        search_query: debouncedSearchQuery,
        p_limit: 50,
      }));
    } else {
      // Corrigido: Verificando latitude e longitude diretamente
      if (latitude === null || longitude === null) {
        toast.error('Localização necessária para buscar restaurantes próximos.');
        setLoading(false);
        return;
      }
      ({ data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: latitude, // Corrigido
        user_lng: longitude, // Corrigido
        max_distance_km: 50, // Default search radius
        search_query: debouncedSearchQuery,
      }));
    }

    if (error) {
      console.error('Error fetching search results:', error);
      toast.error('Erro ao buscar resultados. Tente novamente.');
      setSearchResults([]);
    } else {
      setSearchResults(data || []);
    }
    setLoading(false);
  }, [debouncedSearchQuery, activeType, latitude, longitude]); // Adicionado latitude e longitude às dependências

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  useEffect(() => {
    if (locationError) {
      toast.error('Não foi possível obter sua localização. Algumas funcionalidades podem ser limitadas.');
    }
  }, [locationError]);

  const renderSkeletons = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-2xl p-4 shadow-soft-lg border border-gray-100">
        <Skeleton className="w-20 h-20 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-background-dark-alt">
      <div className="p-4 bg-white dark:bg-background-dark shadow-md">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 dark:text-white">Busca</h1>
          <div className="w-10"></div> {/* Placeholder for alignment */}
        </div>

        <div className="relative flex items-center mb-4">
          <Search className="absolute left-3 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder={activeType === 'dishes' ? 'Buscar por prato...' : 'Buscar por restaurante...'}
            className="w-full pl-10 pr-4 py-2 rounded-xl border-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-0 shadow-inner bg-gray-100 dark:bg-gray-700 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="ghost" size="icon" className="ml-2 text-gray-600 dark:text-gray-300">
            <ChevronRight size={20} />
          </Button>
        </div>

        <div className="flex justify-around mb-4 space-x-2">
          <Button variant="outline" className="flex-1 rounded-xl border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700">
            <DollarSign size={16} className="mr-2" /> Preço
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700">
            <MapPin size={16} className="mr-2" /> Distância
          </Button>
        </div>

        <SearchToggle activeType={activeType} onToggle={handleToggle} />
      </div>

      <ScrollArea className="flex-1 p-4">
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
          {activeType === 'dishes' ? 'Pratos Populares' : 'Restaurantes Populares'}
        </h2>

        <div className="space-y-4">
          {loading || locationLoading ? (
            renderSkeletons()
          ) : searchResults.length > 0 ? (
            searchResults.map((item) => (
              <SearchItemCard
                key={item.id}
                id={item.id}
                name={item.name || (item as MenuItem).item_name}
                price={(item as MenuItem).item_price || 0} // Only for dishes
                description={item.description || (item as MenuItem).item_description}
                imageUrl={item.image_url || (item as MenuItem).item_image_url}
                restaurantName={(item as MenuItem).restaurant_name || item.name} // Use restaurant_name for dishes, or item.name for restaurants
                onClick={(itemId) => handleItemClick(itemId, activeType)}
              />
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum resultado encontrado.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SearchUnifiedPage;