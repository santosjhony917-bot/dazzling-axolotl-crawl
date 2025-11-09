import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ChefHat, Store } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantCard from '@/components/RestaurantCard';
import MenuItemCard from '@/components/MenuItemCard';

const SearchUnifiedPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'items');

  const [itemResults, setItemResults] = useState<any[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setItemResults([]);
        setRestaurantResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const userLocation = JSON.parse(localStorage.getItem('userLocation') || '{}');
      const lat = userLocation.latitude || -23.5505; // Fallback to São Paulo
      const lng = userLocation.longitude || -46.6333;

      const [itemsRes, restaurantsRes] = await Promise.all([
        supabase.rpc('search_menu_items', { search_query: query, p_limit: 25 }),
        supabase.rpc('find_nearby_restaurants', {
          user_lat: lat,
          user_lng: lng,
          search_query: query,
          max_distance_km: 50,
        }),
      ]);

      if (itemsRes.data) setItemResults(itemsRes.data);
      if (restaurantsRes.data) setRestaurantResults(restaurantsRes.data);

      setLoading(false);
    };

    const handler = setTimeout(() => {
      setSearchParams(query ? { q: query, tab: activeTab } : { tab: activeTab }, { replace: true });
      performSearch();
    }, 500);

    return () => clearTimeout(handler);
  }, [query, activeTab, setSearchParams]);

  useEffect(() => {
    setSearchParams({ q: query, tab: activeTab }, { replace: true });
  }, [activeTab, query, setSearchParams]);

  const pageContent = useMemo(() => {
    if (loading) {
      return (
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    if (!query.trim()) {
      return (
        <div className="text-center p-8 text-gray-500 flex flex-col items-center">
          <Search className="w-12 h-12 mb-4 text-gray-300" />
          <h3 className="font-semibold text-lg">Busque por pratos ou restaurantes</h3>
          <p className="text-sm">Encontre o que você deseja em sua região.</p>
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sticky top-[80px] z-10 bg-background/95 backdrop-blur-sm rounded-none border-b">
          <TabsTrigger value="items">
            <ChefHat className="w-4 h-4 mr-2" />
            Pratos ({itemResults.length})
          </TabsTrigger>
          <TabsTrigger value="restaurants">
            <Store className="w-4 h-4 mr-2" />
            Restaurantes ({restaurantResults.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="pt-2">
          <div className="space-y-3 p-2.5">
            {itemResults.length > 0 ? (
              itemResults.map((item) => <MenuItemCard key={item.item_id} item={item} />)
            ) : (
              <p className="text-center text-gray-500 pt-16">Nenhum prato encontrado.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="restaurants" className="pt-2">
          <div className="space-y-3 p-2.5">
            {restaurantResults.length > 0 ? (
              restaurantResults.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))
            ) : (
              <p className="text-center text-gray-500 pt-16">Nenhum restaurante encontrado.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  }, [loading, query, activeTab, itemResults, restaurantResults]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm p-4 border-b">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar pratos ou restaurantes..."
            className="pl-10 w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-md mx-auto pb-24">
        {pageContent}
      </main>

      <ClientBottomNav />
    </div>
  );
};

export default SearchUnifiedPage;