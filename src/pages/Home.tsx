import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, Loader2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import CustomerBottomNav from '@/components/CustomerBottomNav';
import { createPageUrl } from '@/utils/url';
import { useNearbyRestaurants, NearbyRestaurant } from '@/hooks/useNearbyRestaurants';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { RestaurantWithDistance } from '@/types/restaurant'; // Importando o tipo correto

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

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
    searchQuery: searchQuery,
  });

  const handleLocationSaved = () => {
    refetchLocation();
    setIsLocationModalOpen(false);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    // Navega para a página de resultados com os parâmetros de busca
    navigate(`/restaurant-results?lat=${userLat}&lon=${userLon}&distance=10&search=${searchQuery}`);
  };

  const handleOpenSearchConfig = () => {
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    // Navega para a página de configuração de busca (SearchRestaurants)
    navigate(createPageUrl('search-restaurants'));
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header com Localização */}
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
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
              <p className="text-base font-bold text-[#022D68] truncate max-w-[250px]">
                {location.address.split(',')[0] || "Definir Local"}
              </p>
            )}
          </div>
        </div>
        
        {/* Barra de Busca */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar pratos ou restaurantes..."
              className="w-full pl-10 h-12 text-base rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button size="icon" variant="outline" className="h-12 w-12 rounded-full shrink-0" onClick={handleOpenSearchConfig}>
              <Filter className="w-5 h-5" />
          </Button>
        </form>
      </header>

      <main className="p-4 space-y-6">
        <h2 className="text-xl font-bold text-[#022D68]">Restaurantes em Destaque</h2>
        
        {isRestaurantsLoading || isLocationLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-48 rounded-xl" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
        ) : restaurantsError ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">Erro ao carregar restaurantes:</p>
            <p>{restaurantsError}</p>
            <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
          </div>
        ) : restaurants.length > 0 ? (
          <div className="space-y-4">
            {/* Usando o tipo correto RestaurantWithDistance */}
            {restaurants.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant as RestaurantWithDistance} 
                onClick={() => navigate(createPageUrl(`restaurant-profile/${restaurant.id}`))}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-600">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
            <p className="mt-2">Tente ajustar sua localização ou filtros de busca.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <CustomerBottomNav selectedTab="home" />

      {/* User Location Modal */}
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={handleLocationSaved}
      />
    </div>
  );
};

export default Home;