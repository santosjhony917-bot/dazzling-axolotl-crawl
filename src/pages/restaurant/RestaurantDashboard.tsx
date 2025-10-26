import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Utensils, TrendingUp, Pencil, Store, Loader2, BarChart3, Search, DollarSign, Compass, Filter } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { useUserRole } from '@/hooks/useUserRole';
import ActionCard from '@/components/restaurant/dashboard/ActionCard';
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import HighlightCard from '@/components/restaurant/dashboard/HighlightCard';
import NearbyCompetitorCard from '@/components/restaurant/dashboard/NearbyCompetitorCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showSuccess, showError } from '@/utils/toast';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { Input } from '@/components/ui/input';

// Mock Data
const mockHighlights = [
  { id: 'h1', name: "Hambúrguer Gourmet", restaurantName: "Burger Joint", price: 35.00, imageUrl: "https://images.unsplash.com/photo-1568901346537-21b8284b7423?q=80&w=1974&auto=format&fit=crop" },
  { id: 'h2', name: "Moqueca de Camarão", restaurantName: "Restaurante Mar", price: 75.00, imageUrl: "https://images.unsplash.com/photo-1580476262798-57a42912da26?q=80&w=1974&auto=format&fit=crop" },
  { id: 'h3', name: "Taco de Carnitas", restaurantName: "El Fuego", price: 28.00, imageUrl: "https://images.unsplash.com/photo-1565299624942-4c8d4e281ace?q=80&w=1974&auto=format&fit=crop" },
];

const mockCompetitors = [
  { id: 'c1', name: "Trattoria del Ponte", cuisine: "Italiana", distance: 1.2, rating: 4.7, imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop" },
  { id: 'c2', name: "Sakura Sushi", cuisine: "Japonesa", distance: 2.5, rating: 4.9, imageUrl: "https://images.unsplash.com/photo-1550547660-d94500ad4594?q=80&w=1974&auto=format&fit=crop" },
  { id: 'c3', name: "Le Petit Bistrot", cuisine: "Francesa", distance: 3.1, rating: 4.6, imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1974&auto=format&fit=crop" },
];

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { location, isLoading, refetch } = useUserSearchLocation();
  const { isPremium } = useUserRole();
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState(''); // Mantido, mas não usado na UI

  const handleLocationSaved = () => {
    refetch();
  };
  
  const handleSearchByPrice = () => {
    if (location.latitude === null || location.longitude === null) {
      showError("Defina sua localização primeiro para usar o filtro de preço.");
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
    if (location.latitude === null || location.longitude === null) {
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
  
  const handleOpenSearchConfig = () => {
    navigate(createPageUrl('search-unified'));
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Redireciona para a busca unificada
    navigate(createPageUrl('search-unified'));
  };
  
  const handleViewCompetitor = (id: string) => {
    // Simula a navegação para o perfil público do concorrente
    navigate(createPageUrl('restaurantProfile', { restaurantId: id }));
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header (Localização e Ícone da Loja) */}
      <header className="bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsLocationModalOpen(true)}
          >
            <MapPin className="h-6 w-6 text-[#022D68]" />
            <div>
              <p className="text-xs text-gray-500">Sua Localização</p>
              {isLoading ? (
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#022D68] hover:bg-[#022D68]/5 bg-gray-100 rounded-xl"
            onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
          >
            <Store className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Barra de Busca e Ações Rápidas removidas */}
        
      </header>

      <main className="p-4 space-y-6">
        
        {/* Banner Premium (Carousel) */}
        <PremiumBanner />

        {/* Destaques do Dia */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#022D68]">Destaques do Dia</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={() => alert("Ver todos os destaques")}
            >
              Ver todos
            </Button>
          </div>
          <ScrollArea className="w-full whitespace-nowrap pb-4 hide-scrollbar">
            <div className="flex space-x-4">
              {mockHighlights.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Restaurantes Próximos (Concorrentes) */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#022D68]">Restaurantes Próximos</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={handleSearchNearby}
            >
              Ver todos
            </Button>
          </div>
          <div className="space-y-3">
            {mockCompetitors.map((item) => (
              <NearbyCompetitorCard 
                key={item.id} 
                item={{...item, rating: 0}} // Removendo rating
                onClick={handleViewCompetitor} 
              />
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <RestaurantBottomNav selectedTab="home" isFree={!isPremium} />

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