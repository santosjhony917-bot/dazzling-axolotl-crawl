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
import { MetricsCard } from '@/components/MetricsCard';
import { useNearbyRestaurantsByRole } from '@/hooks/useNearbyRestaurantsByRole';

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

  // Check if location is defined - more permissive check
  const hasLocation = !!(restaurant?.address || restaurant?.city || (restaurant?.latitude && restaurant?.longitude));

  // Fetch nearby premium restaurants (limit to 3) - Lógica de busca de concorrentes
  const { restaurants: nearbyRestaurants, loading: loadingNearby } = useNearbyRestaurantsByRole({
    maxDistanceKm: 20,
    requiredRole: 'premium_restaurant',
    enabled: hasLocation && !!restaurant,
    latitude: userLat,
    longitude: userLon
  });

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
      showError("Defina sua localização primeiro para usar o filtro de preço.");
      setIsLocationModalOpen(true);
      return;
    }
    setIsPriceModalOpen(true);
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
    showSuccess(`Filtro de preço aplicado: R$${minPrice.toFixed(2)} a R$${maxPrice.toFixed(2)}. Redirecionando para Busca.`);
    navigate(createPageUrl('restaurant-area/search', undefined, {
      minPrice: minPrice.toString(),
      maxPrice: maxPrice.toString(),
      searchType: 'dish'
    }));
    setIsPriceModalOpen(false); // Fechar o modal após aplicar
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
    navigate(createPageUrl('restaurant-area/search', undefined, {
      maxDistance: maxDistanceKm.toString(),
      searchType: 'restaurant'
    }));
    setIsDistanceModalOpen(false); // Fechar o modal após aplicar
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
      <header className="bg-white p-4 sticky top-0 z-50 shadow-sm">
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

        {/* Metrics Card - Lógica de exibição de métricas */}
        <MetricsCard
          visitors={restaurant?.visitors || 0}
          followers={restaurant?.followers || 0}
          className="mt-4"
        />

        {/* Banner Premium (Carousel) */}
        <PremiumBanner />

      </main>

      {/* Bottom Navigation - Removido pois já está no SharedLayoutWrapper */}
      {/* <RestaurantBottomNav isFree={!isPremium} /> */}

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