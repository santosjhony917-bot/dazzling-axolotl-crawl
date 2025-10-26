import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Filter, Loader2, Utensils, DollarSign, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import ClientBottomNav from '@/components/ClientBottomNav';
import { createPageUrl } from '@/utils/url';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { Restaurant } from '@/types/restaurant';
import ActionCard from '@/components/restaurant/dashboard/ActionCard';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { ScrollArea } from '@/components/ui/scroll-area'; // Importando ScrollArea
import HighlightCard from '@/components/restaurant/dashboard/HighlightCard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // CORREÇÃO: Desestruturando userLat e userLon de location
  const userLat = location.latitude;
  const userLon = location.longitude;

  // Mock Data (Replicando do Dashboard para consistência visual)
  const mockHighlights = [
    { id: 'h1', name: "Hambúrguer Gourmet", restaurantName: "Burger Joint", price: 35.00, imageUrl: "https://images.unsplash.com/photo-1568901346537-21b8284b7423?q=80&w=1974&auto=format&fit=crop" },
    { id: 'h2', name: "Moqueca de Camarão", restaurantName: "Restaurante Mar", price: 75.00, imageUrl: "https://images.unsplash.com/photo-1580476262798-57a42912da26?q=80&w=1974&auto=format&fit=crop" },
    { id: 'h3', name: "Taco de Carnitas", restaurantName: "El Fuego", price: 28.00, imageUrl: "https://images.unsplash.com/photo-1565299624942-4c8d4e281ace?q=80&w=1974&auto=format&fit=crop" },
  ];

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
    // Redireciona para a página de busca unificada
    navigate(createPageUrl('search-unified'));
  };

  const handleOpenSearchConfig = () => {
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    // Navega para a página de busca unificada
    navigate(createPageUrl('search-unified'));
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
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header com Localização */}
      <header className="bg-white p-4 shadow-sm">
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
        
        {/* Barra de Busca e Ações Rápidas removidas */}
        
      </header>

      <main className="p-4 space-y-6">
        
        {/* Ações Rápidas (BOTÕES DE BUSCA) - RESTAURADO */}
        <div className="flex gap-4 pt-2">
          <Button 
            onClick={handleSearchByPrice}
            variant="outline"
            className="flex-1 h-12 rounded-xl border-gray-300 text-primary hover:bg-gray-100"
          >
            <DollarSign className="w-5 h-5 mr-2" /> Preço
          </Button>
          <Button 
            onClick={handleSearchNearby}
            variant="outline"
            className="flex-1 h-12 rounded-xl border-gray-300 text-primary hover:bg-gray-100"
          >
            <Compass className="w-5 h-5 mr-2" /> Distância
          </Button>
        </div>
        
        <h2 className="text-xl font-bold text-[#022D68]">Destaques do Dia</h2>
        
        {/* Destaques do Dia (Horizontal Scroll) */}
        <ScrollArea className="w-full whitespace-nowrap pb-4 hide-scrollbar">
            <div className="flex space-x-4">
              {mockHighlights.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
        </ScrollArea>
        
        <h2 className="text-xl font-bold text-[#022D68]">Restaurantes Próximos</h2>

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
            {/* O tipo NearbyRestaurant é um subconjunto de Restaurant, mas forçamos a tipagem para compatibilidade com RestaurantCard. */}
            {restaurants.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant as unknown as Restaurant} 
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
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
      <ClientBottomNav selectedTab="home" />

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