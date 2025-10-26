import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils, ChevronRight, Filter, DollarSign, Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { showInfo, showError } from '@/utils/toast';
import ClientBottomNav from '@/components/ClientBottomNav';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import SearchToggle from '@/components/SearchToggle';
import SearchItemCard from '@/components/search/SearchItemCard';
import { useAuthContext } from '@/context/AuthContext';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';

type SearchType = 'dish' | 'restaurant';

// Mock de dados para Pratos em Destaque
const mockDishHighlights = [
  { id: 'd1', name: 'Moqueca de Camarão', description: 'Um ensopado tradicional de camarão cozido em leite de coco...', price: 59.90, imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a4513?q=80&w=1974&auto=format&fit=crop', type: 'dish' as const },
  { id: 'd2', name: 'Picanha na Chapa', description: 'Picanha fatiada e grelhada em chapa quente, servida com...', price: 79.90, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop', type: 'dish' as const },
];

// Mock de dados para Restaurantes em Destaque
const mockRestaurantHighlights = [
  { id: 'r1', name: 'Trattoria del Ponte', category: 'Italiana', city: 'João Pessoa', price: undefined, imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop', type: 'restaurant' as const },
  { id: 'r2', name: 'Sakura Sushi', category: 'Japonesa', city: 'João Pessoa', price: undefined, imageUrl: 'https://images.unsplash.com/photo-1550547660-d94500ad4594?q=80&w=1974&auto=format&fit=crop', type: 'restaurant' as const },
];


export default function SearchUnifiedPage() {
  const navigate = useNavigate();
  const { user, restaurant } = useAuthContext();
  const { isPremium } = useUserRole();
  const isRestaurantOwner = !!restaurant;
  
  const { location, isLoading: isLocationLoading } = useUserSearchLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchType, setActiveSearchType] = useState<SearchType>('dish');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

  const userLat = location.latitude;
  const userLon = location.longitude;

  // Lógica de Busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto sua localização é definida.");
      return;
    }
    
    // Navega para a página de resultados, passando a localização, a query e o tipo de busca
    navigate(`/restaurant-results?lat=${userLat}&lng=${userLon}&query=${searchQuery}&type=${activeSearchType}&address=${encodeURIComponent(location.address)}`);
  };
  
  const handleItemClick = (itemId: string, type: SearchType) => {
    if (type === 'restaurant') {
      navigate(createPageUrl('restaurantProfile', { restaurantId: itemId }));
    } else {
      showInfo("Funcionalidade de detalhe do prato em desenvolvimento.");
    }
  };
  
  const handleSearchByPrice = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de preço.");
      return;
    }
    setIsPriceModalOpen(true);
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
    showInfo(`Filtro de preço aplicado: R$${minPrice.toFixed(2)} a R$${maxPrice.toFixed(2)}. Redirecionando para Busca.`);
    // Para fins de demonstração, navegamos para a página de resultados com a query de preço
    navigate(`/restaurant-results?lat=${userLat}&lng=${userLon}&minPrice=${minPrice}&maxPrice=${maxPrice}&type=${activeSearchType}&address=${encodeURIComponent(location.address)}`);
    setIsPriceModalOpen(false);
  };

  const handleSearchNearby = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de distância.");
      return;
    }
    setIsDistanceModalOpen(true);
  };
  
  const handleApplyDistanceFilter = (maxDistanceKm: number) => {
    showInfo(`Filtro de distância aplicado: até ${maxDistanceKm} km.`);
    // Para fins de demonstração, navegamos para a página de resultados com a query de distância
    navigate(`/restaurant-results?lat=${userLat}&lng=${userLon}&distance=${maxDistanceKm}&type=${activeSearchType}&address=${encodeURIComponent(location.address)}`);
    setIsDistanceModalOpen(false);
  };

  const highlights = activeSearchType === 'dish' ? mockDishHighlights : mockRestaurantHighlights;
  const highlightTitle = activeSearchType === 'dish' ? 'Pratos em Destaque' : 'Restaurantes em Destaque';

  const toggleType = activeSearchType === 'dish' ? 'dishes' : 'restaurants';
  const handleToggleChange = (type: 'dishes' | 'restaurants') => {
    setActiveSearchType(type === 'dishes' ? 'dish' : 'restaurant');
  };
  
  const handleBack = () => {
    navigate(-1);
  };

  // Renderiza o conteúdo da página
  const pageContent = (
    <div className="p-4 space-y-6">
      
      {/* Barra de Busca e Filtro */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder={activeSearchType === 'dish' ? "Buscar por prato..." : "Buscar por restaurante..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 h-12 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-sm"
          />
        </div>
        <Button 
          type="submit" // Alterado para submit para iniciar a busca
          size="icon" 
          variant="highlight" 
          className="h-12 w-12 rounded-xl shrink-0 bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </form>
      
      {/* Ações Rápidas (Filtros) */}
      <div className="flex gap-4">
        <Button 
          onClick={handleSearchByPrice}
          variant="outline"
          className="flex-1 h-12 rounded-xl border-gray-300 text-primary hover:bg-gray-100 shadow-soft-md"
        >
          <DollarSign className="w-5 h-5 mr-2" /> Preço
        </Button>
        <Button 
          onClick={handleSearchNearby}
          variant="outline"
          className="flex-1 h-12 rounded-xl border-gray-300 text-primary hover:bg-gray-100 shadow-soft-md"
        >
          <Compass className="w-5 h-5 mr-2" /> Distância
        </Button>
      </div>
      
      {/* Toggle Pratos / Restaurantes */}
      <SearchToggle activeType={toggleType} onToggle={handleToggleChange} />

      {/* Destaques */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-primary">{highlightTitle}</h2>
        <div className="space-y-3">
          {highlights.map((item) => (
            <SearchItemCard 
              key={item.id} 
              item={item} 
              onClick={handleItemClick}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Cabeçalho Manual */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Busca</h2>
        </div>
        <div className="w-10"></div>
      </header>
      
      <main className="flex-1 w-full max-w-md mx-auto pb-20">
        {pageContent}
      </main>
      
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
      
      {/* Navegação Inferior Condicional */}
      {isRestaurantOwner ? (
        <RestaurantBottomNav selectedTab="search" isFree={!isPremium} />
      ) : (
        <ClientBottomNav selectedTab="search" />
      )}
    </div>
  );
}