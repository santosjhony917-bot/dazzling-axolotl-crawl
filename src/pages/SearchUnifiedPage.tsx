import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils, ChevronRight, Filter, DollarSign, Compass, ArrowLeft, Pizza } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { showInfo, showError } from '@/utils/toast';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import SearchToggle from '@/components/SearchToggle';
import SearchItemCard from '@/components/search/SearchItemCard';
import { useAuthData } from '@/context/AuthContext';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { useUserRole } from '@/hooks/useUserRole';
import { motion } from 'framer-motion'; // Import motion
import { Skeleton } from '@/components/ui/skeleton';

type SearchType = 'dish' | 'restaurant';

// Placeholder para Destaques (será preenchido por lógica futura ou permanecerá vazio)
const placeholderHighlights: any[] = [];


export default function SearchUnifiedPage() {
  const navigate = useNavigate();
  const { user, restaurant } = useAuthData();
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
      navigate(createPageUrl('menuItemDetails', { itemId: itemId }));
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

  const highlights = placeholderHighlights; // Usando placeholder vazio
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
            className="w-full pl-10 h-12 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight shadow-soft-md"
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
      
      {/* Ações Rápidas (Filtros) - Transformadas em Chips Elegantes */}
      <div className="flex gap-4">
        <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
          <Button 
            onClick={handleSearchByPrice}
            variant="outline"
            className="w-full h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all"
          >
            <DollarSign className="w-5 h-5 mr-2 text-highlight" /> Preço
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
          <Button 
            onClick={handleSearchNearby}
            variant="outline"
            className="w-full h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all"
          >
            <Compass className="w-5 h-5 mr-2 text-highlight" /> Distância
          </Button>
        </motion.div>
      </div>
      
      {/* Toggle Pratos / Restaurantes */}
      <SearchToggle activeType={toggleType} onToggle={handleToggleChange} />

      {/* Destaques */}
      <motion.div
        key={activeSearchType} // Key change triggers animation
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-bold text-primary">{highlightTitle}</h2>
        <div className="space-y-3">
          {highlights.length > 0 ? (
            highlights.map((item) => (
              <SearchItemCard 
                key={item.id} 
                item={item} 
                onClick={handleItemClick}
              />
            ))
          ) : (
            <Card className="p-6 text-center shadow-soft-md border-none rounded-xl">
              <Pizza className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum destaque encontrado. Tente pesquisar!</p>
            </Card>
          )}
        </div>
      </motion.div>
      
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

  return (
    <>
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
      
      <main className="flex-1 w-full max-w-md mx-auto pb-20 bg-white">
        {pageContent}
      </main>
    </>
  );
}