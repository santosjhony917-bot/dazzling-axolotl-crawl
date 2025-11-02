import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, DollarSign, Compass, Utensils, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import ActionCard from '@/components/restaurant/dashboard/ActionCard';
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import HighlightCard from '@/components/restaurant/dashboard/HighlightCard';
import NearbyCompetitorCard from '@/components/restaurant/dashboard/NearbyCompetitorCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { usePopularMenuItems } from '@/hooks/usePopularMenuItems';
import { motion, AnimatePresence } from 'framer-motion';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { location, isLocationLoading, error: locationError, refetchLocation } = useUserLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchByPriceModalOpen, setIsSearchByPriceModalOpen] = useState(false);
  const [isSearchByDistanceModalOpen, setIsSearchByDistanceModalOpen] = useState(false);

  const {
    restaurants,
    isLoading: isRestaurantsLoading,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useNearbyRestaurants(location?.latitude, location?.longitude, searchQuery);

  const {
    popularMenuItems,
    isLoading: isLoadingPopularItems,
    error: popularItemsError,
  } = usePopularMenuItems();

  useEffect(() => {
    if (locationError) {
      showError(locationError.message);
    }
  }, [locationError]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl('search-unified', { searchQuery }));
    }
  };

  const handleSearchByPrice = (minPrice: number, maxPrice: number) => {
    setIsSearchByPriceModalOpen(false);
    showSuccess(`Filtro de preço aplicado: R$${minPrice.toFixed(2)} a R$${maxPrice.toFixed(2)}. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified', { minPrice: minPrice.toString(), maxPrice: maxPrice.toString() }));
  };

  const handleSearchByDistance = (maxDistanceKm: number) => {
    setIsSearchByDistanceModalOpen(false);
    showSuccess(`Filtro de distância aplicado: até ${maxDistanceKm} km. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified', { maxDistance: maxDistanceKm.toString() }));
  };

  return (
    <div className="bg-[#f5f7f8]">
      
      {/* Header com Localização */}
      <header className="bg-white p-4 shadow-soft-md sticky top-0 z-10">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsSearchByDistanceModalOpen(true)} // Usando o modal de distância para definir localização
        >
          <MapPin className="h-6 w-6 text-[#E47948]" />
          <div>
            <p className="text-xs text-gray-500">Localização de Busca</p>
            {isLocationLoading ? (
              <div className="flex items-center text-sm font-bold text-[#022D68]">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Carregando...
              </div>
            ) : (
              <p className="text-base font-extrabold text-[#022D68] tracking-tight truncate max-w-[250px]">
                {location?.address?.split(',')[0] || "Definir Local"}
              </p>
            )}
          </div>
        </div>
        
        {/* Barra de Busca Principal */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mt-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar por prato ou restaurante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-12 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-md"
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            variant="highlight" 
            className="h-12 w-12 rounded-xl shrink-0 bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
          >
            <Search className="w-5 h-5" />
          </Button>
        </form>
        
      </header>

      <main className="p-4 space-y-6">
        
        {/* Ações Rápidas (Filtros) */}
        <div className="flex gap-4 pt-2">
          <ActionCard 
            title="Buscar Prato|por Preço" 
            icon={DollarSign} 
            onClick={() => setIsSearchByPriceModalOpen(true)}
          />
          <ActionCard 
            title="Buscar Restaurantes|Próximos" 
            icon={Compass} 
            onClick={() => setIsSearchByDistanceModalOpen(true)}
          />
        </div>
        
        {/* Banner Premium */}
        <PremiumBanner />
        
        {/* Pratos Populares */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Pratos Populares</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={() => navigate(createPageUrl('search-unified', { category: 'popular' }))} // Exemplo de navegação
            >
              Ver todos
            </Button>
          </div>
          <ScrollArea className="w-full whitespace-nowrap hide-scrollbar">
            <div className="flex flex-nowrap space-x-4 pb-6">
              <AnimatePresence mode="wait">
                {isLoadingPopularItems ? (
                  <motion.div
                    key="popular-items-loading"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-nowrap space-x-4"
                  >
                    <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
                    <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
                    <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
                  </motion.div>
                ) : popularMenuItems && popularMenuItems.length > 0 ? (
                  <motion.div
                    key="popular-items-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-nowrap space-x-4"
                  >
                    {popularMenuItems.map((item) => (
                      <HighlightCard 
                        key={item.id} 
                        item={{
                          id: item.id,
                          name: item.name,
                          restaurantName: item.restaurantName,
                          price: item.price,
                          imageUrl: item.imageUrl || 'https://via.placeholder.com/300x200?text=Prato+Popular', // Fallback image
                        }} 
                        className="flex-shrink-0"
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="popular-items-empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-center p-4 text-gray-500 bg-white rounded-xl shadow-soft-md w-full"
                  >
                    Nenhum prato popular encontrado.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        {/* Restaurantes Próximos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes Próximos</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={() => navigate(createPageUrl('search-unified', { type: 'nearby' }))} // Exemplo de navegação
            >
              Ver todos
            </Button>
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {isRestaurantsLoading || isLocationLoading ? (
                <motion.div
                  key="restaurants-loading"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <Skeleton className="w-full h-24 rounded-xl" />
                  <Skeleton className="w-full h-24 rounded-xl" />
                </motion.div>
              ) : restaurantsError ? (
                <motion.div
                  key="restaurants-error"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md"
                >
                  <p className="font-semibold">Erro ao carregar restaurantes:</p>
                  <p>{restaurantsError.message}</p>
                  <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
                </motion.div>
              ) : restaurants && restaurants.length > 0 ? (
                <motion.div
                  key="restaurants-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="space-y-4"
                >
                  {restaurants.map((restaurant) => (
                    <RestaurantCard 
                      key={restaurant.id} 
                      restaurant={restaurant} 
                      onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="restaurants-empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md"
                >
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
                  <p className="mt-2">Tente ajustar sua localização ou filtros de busca.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* User Location Modal */}
      <SearchByPriceModal
        isOpen={isSearchByPriceModalOpen}
        onClose={() => setIsSearchByPriceModalOpen(false)}
        onApply={handleSearchByPrice}
      />
      <SearchByDistanceModal
        isOpen={isSearchByDistanceModalOpen}
        onClose={() => setIsSearchByDistanceModalOpen(false)}
        onApply={handleSearchByDistance}
        currentLocation={location}
        onLocationChange={refetchLocation}
      />
    </div>
  );
};

export default Home;