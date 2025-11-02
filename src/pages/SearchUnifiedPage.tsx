import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, Utensils, DollarSign, ChevronLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import HighlightCard from '@/components/restaurant/dashboard/HighlightCard';
import { createPageUrl } from '@/utils/url';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { usePopularMenuItems } from '@/hooks/usePopularMenuItems';
import { useUserLocation } from '@/hooks/useUserLocation';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';

const SearchUnifiedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const initialSearchQuery = queryParams.get('searchQuery') || '';
  const initialMinPrice = queryParams.get('minPrice');
  const initialMaxPrice = queryParams.get('maxPrice');
  const initialMaxDistance = queryParams.get('maxDistance');
  const initialCategory = queryParams.get('category');
  const initialType = queryParams.get('type'); // 'nearby' para restaurantes próximos

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'menuItems'>(
    initialSearchQuery || initialType === 'nearby' ? 'restaurants' : 'menuItems'
  );

  const { location: userLocation, isLocationLoading, error: locationError } = useUserLocation();

  const {
    restaurants,
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useNearbyRestaurants(
    userLocation?.latitude,
    userLocation?.longitude,
    searchQuery,
    initialMaxDistance ? parseFloat(initialMaxDistance) : undefined
  );

  const {
    popularMenuItems,
    isLoading: isLoadingPopularItems,
    error: popularItemsError,
  } = usePopularMenuItems(searchQuery, initialMinPrice ? parseFloat(initialMinPrice) : undefined, initialMaxPrice ? parseFloat(initialMaxPrice) : undefined);

  useEffect(() => {
    if (locationError) {
      showError(locationError.message);
    }
  }, [locationError]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Atualiza a URL com a nova query de busca
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('searchQuery', searchQuery);
    navigate(`${location.pathname}?${newParams.toString()}`);
  };

  const handleMenuItemClick = (menuItemId: string, restaurantId: string) => {
    navigate(createPageUrl('menuItemDetails', { menuItemId, restaurantId }));
  };

  return (
    <div className="min-h-screen bg-gray-50 md:max-w-md md:mx-auto">
      <header className="flex items-center p-4 bg-white shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <form onSubmit={handleSearchSubmit} className="flex-grow flex items-center relative ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Buscar por prato ou restaurante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 h-10 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-md"
          />
        </form>
      </header>

      <div className="flex justify-around p-2 bg-white border-b border-gray-200 sticky top-[64px] z-10">
        <Button
          variant="ghost"
          className={activeTab === 'restaurants' ? 'border-b-2 border-highlight text-highlight' : 'text-gray-500'}
          onClick={() => setActiveTab('restaurants')}
        >
          Restaurantes
        </Button>
        <Button
          variant="ghost"
          className={activeTab === 'menuItems' ? 'border-b-2 border-highlight text-highlight' : 'text-gray-500'}
          onClick={() => setActiveTab('menuItems')}
        >
          Pratos
        </Button>
      </div>

      <main className="p-4 space-y-6">
        {activeTab === 'restaurants' && (
          <div>
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight mb-4">Resultados de Restaurantes</h2>
            {isRestaurantsLoading || isLocationLoading ? (
              <div className="space-y-4">
                <Skeleton className="w-full h-24 rounded-xl" />
                <Skeleton className="w-full h-24 rounded-xl" />
              </div>
            ) : restaurantsError ? (
              <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md">
                <p className="font-semibold">Erro ao carregar restaurantes:</p>
                <p>{restaurantsError.message}</p>
                <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
              </div>
            ) : restaurants && restaurants.length > 0 ? (
              <div className="space-y-4">
                {restaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
                <p className="mt-2">Tente ajustar sua busca ou filtros.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'menuItems' && (
          <div>
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight mb-4">Resultados de Pratos</h2>
            {isLoadingPopularItems ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="w-full h-[200px] rounded-2xl" />
                <Skeleton className="w-full h-[200px] rounded-2xl" />
              </div>
            ) : popularItemsError ? (
              <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md">
                <p className="font-semibold">Erro ao carregar pratos:</p>
                <p>{popularItemsError.message}</p>
              </div>
            ) : popularMenuItems && popularMenuItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {popularMenuItems.map((item) => (
                  <HighlightCard
                    key={item.id}
                    item={{
                      id: item.id,
                      name: item.name,
                      restaurantName: item.restaurantName,
                      price: item.price,
                      imageUrl: item.imageUrl || 'https://via.placeholder.com/300x200?text=Prato',
                    }}
                    onClick={() => handleMenuItemClick(item.id, item.restaurantId)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-semibold">Nenhum prato encontrado</p>
                <p className="mt-2">Tente ajustar sua busca ou filtros.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchUnifiedPage;