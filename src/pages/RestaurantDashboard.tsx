import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Utensils, TrendingUp, Pencil, Store, Loader2, BarChart3, Search, DollarSign, Compass } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { useUserRole } from '@/hooks/useUserRole';
import ActionCard from '@/components/restaurant/dashboard/ActionCard';
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import HighlightCard from '@/components/restaurant/dashboard/HighlightCard';
import NearbyCompetitorCard from '@/components/restaurant/dashboard/NearbyCompetitorCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { showSuccess, showError } from '@/utils/toast';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useNearbyCompetitors } from '@/hooks/useNearbyCompetitors';
import { Skeleton } from '@/components/ui/skeleton';

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const { isPremium } = useUserRole();
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = React.useState(false);
  
  const { restaurant, isLoading: isProfileLoading } = useRestaurantProfile();
  const currentRestaurantId = restaurant?.id;
  const userLat = restaurant?.latitude ?? location.latitude;
  const userLon = restaurant?.longitude ?? location.longitude;

  // Busca concorrentes próximos (usando a localização do restaurante, se disponível, ou a localização de busca do usuário)
  const { 
    competitors, 
    isLoading: isCompetitorsLoading, 
    error: competitorsError 
  } = useNearbyCompetitors(currentRestaurantId, userLat, userLon);

  const handleLocationSaved = () => {
    refetchLocation();
  };
  
  const handleSearchByPrice = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de distância.");
      setIsLocationModalOpen(true);
      return;
    }
    setIsPriceModalOpen(true);
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
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
    showSuccess(`Filtro de distância aplicado: até ${maxDistanceKm} km. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified'));
  };
  
  const handleViewCompetitor = (id: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId: id }));
  };

  // Usando os 3 primeiros concorrentes como Destaques (mock)
  const highlights = competitors.slice(0, 3).map(r => ({
    id: r.id,
    name: r.name,
    restaurantName: r.category || 'Geral',
    price: 25.00, // Preço mockado
    imageUrl: r.imageUrl, // Usando a URL real
  }));

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header (Localização e Ícone da Loja) */}
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsLocationModalOpen(true)}
          >
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xs text-gray-500">Localização do Restaurante</p>
              {isProfileLoading ? (
                <div className="flex items-center text-sm font-bold text-primary">
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Carregando...
                </div>
              ) : (
                <p className="text-base font-bold text-primary truncate max-w-[200px]">
                  {restaurant?.name || "Definir Local"}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary hover:bg-primary/5 bg-gray-100 rounded-xl"
            onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
          >
            <Store className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        
        {/* Ações Rápidas (BOTÕES DE BUSCA) */}
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

        {/* Banner Premium (Carousel) */}
        <PremiumBanner />

        {/* Destaques do Dia */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Destaques Próximos</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={handleSearchNearby}
            >
              Ver todos
            </Button>
          </div>
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex space-x-4">
              {isCompetitorsLoading ? (
                <>
                  <Skeleton className="min-w-[200px] h-[200px] rounded-xl" />
                  <Skeleton className="min-w-[200px] h-[200px] rounded-xl" />
                </>
              ) : highlights.length > 0 ? (
                highlights.map((item) => (
                  <HighlightCard key={item.id} item={item} />
                ))
              ) : (
                <div className="text-center p-4 text-gray-500 bg-white rounded-xl shadow-soft-md w-full">
                  Nenhum destaque próximo encontrado.
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Restaurantes Próximos (Concorrentes) */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Concorrentes Próximos</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={handleSearchNearby}
            >
              Ver todos
            </Button>
          </div>
          <div className="space-y-3">
            {isCompetitorsLoading ? (
              <>
                <Skeleton className="w-full h-20 rounded-xl" />
                <Skeleton className="w-full h-20 rounded-xl" />
              </>
            ) : competitorsError ? (
              <div className="text-center p-4 text-red-500 bg-red-50 rounded-xl">
                Erro ao carregar concorrentes.
              </div>
            ) : competitors.length > 0 ? (
              competitors.map((item) => (
                <NearbyCompetitorCard 
                  key={item.id} 
                  item={{
                    id: item.id,
                    name: item.name,
                    cuisine: item.category, // Mapeado de category
                    distance: item.distance_km, // Mapeado de distance_km
                    rating: 0, // Mocked
                    imageUrl: item.imageUrl, // Mapeado do hook
                  }} 
                  onClick={handleViewCompetitor} 
                />
              ))
            ) : (
              <div className="text-center p-4 text-gray-500 bg-white rounded-xl shadow-soft-md">
                Nenhum concorrente encontrado.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <RestaurantBottomNav isFree={!isPremium} />

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

export default RestaurantDashboard;