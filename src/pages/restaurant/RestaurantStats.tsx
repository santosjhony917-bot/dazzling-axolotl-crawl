import React, { useState, useEffect, useCallback } from 'react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { BarChart3, Search, MapPin, Filter, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import NearbyCompetitorCard from '@/components/restaurant/dashboard/NearbyCompetitorCard';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { formatDistance } from '@/services/geocoding';
import { Card, CardContent } from '@/components/ui/card';

const DEFAULT_DISTANCE = 10;

export default function RestaurantStats() {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState(DEFAULT_DISTANCE);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const userLat = location.latitude;
  const userLon = location.longitude;

  // Busca restaurantes próximos (concorrentes)
  const { 
    restaurants, 
    loading: isRestaurantsLoading, 
    error: restaurantsError, 
    refetch: refetchRestaurants 
  } = useNearbyRestaurants({
    userLat,
    userLon,
    maxDistanceKm: maxDistance,
    searchQuery: searchQuery,
    enabled: userLat !== null && userLon !== null,
  });
  
  const handleLocationSaved = () => {
    refetchLocation();
    setIsLocationModalOpen(false);
  };
  
  const handleViewCompetitor = (id: string) => {
    // Navega para o perfil público do concorrente
    navigate(`/restaurant-profile/${id}`);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Defina sua localização de busca primeiro.");
      setIsLocationModalOpen(true);
      return;
    }
    refetchRestaurants();
  };

  // --- Etapa 2: Renderização da UI (Localização e Busca) ---
  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      <RestaurantAreaHeader title="Análise de Mercado" icon={BarChart3} backPath="restaurant-area/home" />
      
      <main className="flex-1 w-full max-w-md p-4">
        
        {/* Localização de Busca */}
        <Card className="bg-white p-4 rounded-xl shadow-md mb-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsLocationModalOpen(true)}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-[#022D68]" />
              <div>
                <p className="text-xs text-gray-500">Localização de Busca</p>
                {isLocationLoading ? (
                  <div className="flex items-center text-sm font-bold text-[#022D68]">
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <p className="text-base font-bold text-[#022D68] truncate max-w-[200px]">
                    {location.address.split(',')[0] || "Definir Local"}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-highlight">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Distância máxima: {maxDistance} km</p>
        </Card>

        {/* Barra de Busca */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar concorrentes por nome ou categoria..."
              className="w-full pl-10 h-12 text-base rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLocationLoading || userLat === null}
            />
          </div>
          <Button type="submit" size="icon" className="h-12 w-12 rounded-full shrink-0 bg-primary hover:bg-primary/90" disabled={isLocationLoading || userLat === null}>
              <Search className="w-5 h-5" />
          </Button>
        </form>

        {/* --- Etapa 3: Exibição dos Resultados e Modais --- */}
        <h2 className="text-xl font-bold text-[#022D68] mb-4">Concorrentes Próximos</h2>
        
        {(isRestaurantsLoading || isLocationLoading) ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : restaurantsError ? (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">Erro ao carregar concorrentes:</p>
            <p>{restaurantsError}</p>
            <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
          </div>
        ) : restaurants.length > 0 ? (
          <div className="space-y-3">
            {restaurants.map((item) => (
              <NearbyCompetitorCard 
                key={item.id} 
                item={{
                    id: item.id,
                    name: item.name,
                    cuisine: item.category || 'Cozinha Não Definida',
                    distance: item.distance_km,
                    rating: 4.5, // Mock rating
                    imageUrl: item.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop', // Mock image
                }} 
                onClick={handleViewCompetitor} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-white rounded-xl shadow-md">
            <p className="text-gray-500">Nenhum concorrente encontrado na área de {maxDistance} km.</p>
            <Button onClick={() => setIsLocationModalOpen(true)} className="mt-4 bg-highlight hover:bg-highlight/90">
                Ajustar Localização
            </Button>
          </div>
        )}
      </main>
      
      {/* User Location Modal */}
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={handleLocationSaved}
      />
    </div>
  );
}