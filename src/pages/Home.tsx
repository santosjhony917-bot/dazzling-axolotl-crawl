import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, Loader2, Utensils, DollarSign, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { createPageUrl } from '@/utils/url';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
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

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [distance, setDistance] = React.useState<number[]>([10]); // Inicializando distance

  const userLat = location.latitude;
  const userLon = location.longitude;

  // Busca restaurantes próximos (habilitada apenas se a localização for conhecida)
  const { 
    restaurants, 
    loading: isRestaurantsLoading, 
    error: restaurantsError, 
    refetch: refetchRestaurants 
  } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: userLat !== null && userLon !== null,
    searchQuery: searchQuery, // Passa a query de busca
  });

  // Novo hook para pratos populares
  const { 
    data: popularMenuItems, 
    isLoading: isLoadingPopularItems, 
    error: popularItemsError 
  } = usePopularMenuItems();

  const handleLocationSaved = () => {
    refetchLocation();
    setIsLocationModalOpen(false);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    // Redireciona para a página de resultados com a query
    navigate(`/restaurant-results?lat=${userLat}&lng=${userLon}&distance=${distance[0]}&search=${searchQuery}`);
  };

  const handleSearchByPrice = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de preço.");
      setIsLocationModalOpen(true);
      return;
    }
    setIsPriceModalOpen(true);
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
    // Redireciona para a tela de busca unificada com os filtros aplicados (mock)
    showSuccess(`Filtro de preço aplicado: R$${minPrice.toFixed(2)} a R$${maxPrice.toFixed(2)}. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified'));
  };

  const handleSearchNearby = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de distância.");
      setIsLocationModalOpen(true);
      return;
    }
    setIsDistanceModalOpen(true);
  };
  
  const handleApplyDistanceFilter = (maxDistanceKm: number) => {
    // Redireciona para a tela de busca unificada com os filtros aplicados (mock)
    showSuccess(`Filtro de distância aplicado: até ${maxDistanceKm} km. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified'));
  };

  return (
    <div className="bg-[#f5f7f8]"> {/* Removido min-h-screen, pb-20, max-w-md, mx-auto */}
      
      {/* Header com Localização */}
      <header className="bg-white p-4 shadow-soft-md sticky top-0 z-10">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsLocationModalOpen(true)}
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
                {location.address.split(',')[0] || "Definir Local"}
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
            onClick={handleSearchByPrice}
          />
          <ActionCard 
            title="Buscar Restaurantes|Próximos" 
            icon={Compass} 
            onClick={handleSearchNearby}
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
              onClick={() => alert("Ver todos os pratos populares")}
            >
              Ver todos
            </Button>
          </div>
          <ScrollArea className="w-full whitespace-nowrap hide-scrollbar">
            <div className="flex flex-nowrap space-x-4 pb-6"> {/* Adicionando flex-nowrap e padding inferior ao div interno */}
              {isLoadingPopularItems ? (
                <>
                  <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
                  <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
                  <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
                </>
              ) : popularMenuItems && popularMenuItems.length > 0 ? (
                popularMenuItems.map((item) => (
                  <HighlightCard 
                    key={item.id} 
                    item={{
                      id: item.id,
                      name: item.name,
                      restaurantName: item.restaurantName,
                      price: item.price,
                      imageUrl: item.imageUrl || 'https://via.placeholder.com/300x200?text=Prato+Popular', // Fallback image
                    }} 
                    className="flex-shrink-0" // Adicionado flex-shrink-0
                  />
                ))
              ) : (
                <div className="text-center p-4 text-gray-500 bg-white rounded-xl shadow-soft-md w-full">
                  Nenhum prato popular encontrado.
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Restaurantes Próximos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes Próximos</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={handleSearchNearby}
            >
              Ver todos
            </Button>
          </div>
          <div className="space-y-4">
            {isRestaurantsLoading || isLocationLoading ? (
              <>
                <Skeleton className="w-full h-24 rounded-xl" />
                <Skeleton className="w-full h-24 rounded-xl" />
              </>
            ) : restaurantsError ? (
              <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md">
                <p className="font-semibold">Erro ao carregar restaurantes:</p>
                <p>{restaurantsError}</p>
                <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
              </div>
            ) : restaurants.length > 0 ? (
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
                <p className="mt-2">Tente ajustar sua localização ou filtros de busca.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* User Location Modal */}
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={handleLocationSaved}
      />
      
      {/* Modais de Filtro */}
      <SearchByPriceModal
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        onApplyFilter={handleApplyPriceFilter}
      />
      <SearchByDistanceModal
        isOpen={isDistanceModalOpen}
        onClose={() => setIsDistanceModalOpen(false)}
        onApplyFilter={handleApplyDistanceFilter}
      />
    </div>
  );
};

export default Home;