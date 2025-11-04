"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Search, DollarSign, MapPin, UtensilsCrossed, Building2, Filter } from 'lucide-react';
import { useSearchItems, SearchItemResult } from '@/hooks/useSearchItems';
import SearchItemCard from '@/components/search/SearchItemCard';
import CategoryFilterDrawer from '@/components/search/CategoryFilterDrawer';
import { RestaurantWithDistance } from '@/types/supabase';
import { fetchNearbyRestaurants } from '@/integrations/supabase/restaurant';
import { toast } from 'sonner';

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get('query') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeTab, setActiveTab] = useState<'dishes' | 'restaurants'>('dishes');
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<RestaurantWithDistance[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);

  const {
    items: dishResults,
    loading: loadingDishes,
    error: dishError,
    refetch: refetchDishes,
  } = useSearchItems({
    searchQuery: searchQuery,
    enabled: activeTab === 'dishes',
    excludedCategoryIds: excludedCategoryIds,
  });

  const fetchRestaurants = async (query: string) => {
    setLoadingRestaurants(true);
    try {
      const userLat = -23.55052;
      const userLng = -46.63330;
      const data = await fetchNearbyRestaurants(userLat, userLng, 50, query);
      setRestaurantResults(data);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      toast.error("Erro ao buscar restaurantes.");
    } finally {
      setLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    if (initialSearchQuery && activeTab === 'dishes') {
      refetchDishes();
    } else if (initialSearchQuery && activeTab === 'restaurants') {
      fetchRestaurants(initialSearchQuery);
    }
  }, [initialSearchQuery, activeTab, refetchDishes]);

  const handleSearch = () => {
    if (activeTab === 'dishes') {
      refetchDishes();
    } else {
      fetchRestaurants(searchQuery);
    }
    navigate(`/search?query=${searchQuery}`);
  };

  const handleItemClick = (id: string, type: 'dish' | 'restaurant') => {
    if (type === 'dish') {
      navigate(`/menu-item/${id}`);
    } else {
      navigate(`/restaurant/${id}`);
    }
  };

  const handleApplyCategoryFilter = (newExcludedIds: string[]) => {
    setExcludedCategoryIds(newExcludedIds);
    if (activeTab === 'dishes') {
      refetchDishes();
    }
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-grow text-center">Busca</h1>
        <div className="w-10"></div>
      </div>

      {/* Search Input */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar por prato ou restaurante..."
            className="pl-10 pr-4 py-2 rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>
        <Button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">
          <ArrowLeft className="h-5 w-5 rotate-180" />
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex justify-around space-x-2 mb-6">
        <Button variant="outline" className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border-gray-300">
          <DollarSign className="h-4 w-4" />
          <span>Preço</span>
        </Button>
        <Button variant="outline" className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border-gray-300">
          <MapPin className="h-4 w-4" />
          <span>Distância</span>
        </Button>
        <CategoryFilterDrawer
          selectedCategoryIds={excludedCategoryIds}
          onApply={handleApplyCategoryFilter}
        />
      </div>

      {/* Tabs for Dishes and Restaurants */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dishes' | 'restaurants')} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dishes">Pratos</TabsTrigger>
          <TabsTrigger value="restaurants">Restaurantes</TabsTrigger>
        </TabsList>
        <TabsContent value="dishes" className="mt-4">
          <h2 className="text-lg font-semibold mb-3">Resultados de Pratos</h2>
          {loadingDishes ? (
            <p className="text-center text-gray-500">Carregando pratos...</p>
          ) : dishError ? (
            <p className="text-center text-red-500">Erro ao carregar pratos: {dishError}</p>
          ) : dishResults.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent className="flex flex-col items-center justify-center">
                <UtensilsCrossed className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhum prato encontrado. Tente pesquisar!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {dishResults.map((item) => (
                <SearchItemCard
                  key={item.item_id}
                  item={{
                    id: item.item_id,
                    name: item.item_name,
                    description: item.item_description,
                    price: item.item_price,
                    imageUrl: item.item_image_url,
                    type: 'dish',
                    restaurantName: item.restaurant_name,
                    itemCategoryName: item.item_category_name,
                    itemCategoryId: item.item_category_id,
                  }}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="restaurants" className="mt-4">
          <h2 className="text-lg font-semibold mb-3">Resultados de Restaurantes</h2>
          {loadingRestaurants ? (
            <p className="text-center text-gray-500">Carregando restaurantes...</p>
          ) : restaurantResults.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent className="flex flex-col items-center justify-center">
                <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhum restaurante encontrado. Tente pesquisar!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {restaurantResults.map((restaurant) => (
                <SearchItemCard
                  key={restaurant.id}
                  item={{
                    id: restaurant.id,
                    name: restaurant.name,
                    description: restaurant.description,
                    imageUrl: restaurant.image_url,
                    type: 'restaurant',
                    category: restaurant.category,
                    city: restaurant.city,
                  }}
                  onClick={handleItemClick}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SearchResultsPage;