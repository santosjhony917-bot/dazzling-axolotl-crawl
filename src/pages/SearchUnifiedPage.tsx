import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchItems, SearchItemResult } from '@/hooks/useSearchItems';
import { useNearbyRestaurants, RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';
import CategoryFilterDrawer from '@/components/search/CategoryFilterDrawer';
import { useMenuCategories } from '@/hooks/useMenuCategories';

type SearchType = 'dish' | 'restaurant';

// Definindo o tipo SearchItem para compatibilidade com SearchItemCard
interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  price?: number; // Apenas para pratos
  imageUrl: string | null;
  type: 'dish' | 'restaurant';
  // Campos adicionais para restaurante
  category?: string | null;
  city?: string | null;
  distance_km?: number; // Adicionado para ordenação de restaurantes
  restaurantName?: string | null; // Adicionado para exibir o nome do restaurante
  itemCategoryName?: string | null; // Adicionado para exibir a categoria do item
  itemCategoryId?: string; // Adicionado para o ID da categoria do item
}

export default function SearchUnifiedPage() {
  const navigate = useNavigate();
  const { user, restaurant } = useAuthData();
  const { isPremium } = useUserRole();
  const isRestaurantOwner = !!restaurant;
  
  const { location, isLoading: isLocationLoading } = useUserSearchLocation();
  const { categories: allMenuCategories, isLoading: categoriesLoading } = useMenuCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchType, setActiveSearchType] = useState<SearchType>('dish');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

  // Estados para os filtros
  const [minPriceFilter, setMinPriceFilter] = useState<number | null>(null);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number | null>(null);
  const [excludedDishCategoryIds, setExcludedDishCategoryIds] = useState<string[]>([]); // Renomeado para clareza
  const [excludedRestaurantCategories, setExcludedRestaurantCategories] = useState<string[]>([]); // Novo estado para categorias de restaurante

  const userLat = location.latitude;
  const userLon = location.longitude;

  // Hooks de busca
  const {
    items: dishSearchResults,
    loading: dishesLoading,
    error: dishesError,
    refetch: refetchDishes,
  } = useSearchItems({
    searchQuery,
    enabled: activeSearchType === 'dish' && !isLocationLoading && userLat !== null && userLon !== null,
    limit: 50,
    excludedCategoryIds: excludedDishCategoryIds, // Passa as categorias de prato excluídas
  });

  const {
    data: restaurantSearchResults,
    isLoading: restaurantsLoading,
    error: restaurantsError,
    refetch: refetchRestaurants,
  } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: activeSearchType === 'restaurant' && !isLocationLoading && userLat !== null && userLon !== null,
    searchQuery,
    excludedCategories: excludedRestaurantCategories, // Passa as categorias de restaurante excluídas
  });

  const [displayedResults, setDisplayedResults] = useState<SearchItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);

  // Atualiza o estado de carregamento geral
  useEffect(() => {
    setResultsLoading(isLocationLoading || dishesLoading || restaurantsLoading || categoriesLoading);
  }, [isLocationLoading, dishesLoading, restaurantsLoading, categoriesLoading]);

  // Efeito para processar e ordenar os resultados
  useEffect(() => {
    let processedResults: SearchItem[] = [];

    if (activeSearchType === 'dish') {
      processedResults = dishSearchResults
        .filter(item => {
          const price = item.item_price;
          const matchesMinPrice = minPriceFilter === null || price >= minPriceFilter;
          const matchesMaxPrice = maxPriceFilter === null || price <= maxPriceFilter;
          return matchesMinPrice && matchesMaxPrice;
        })
        .sort((a, b) => a.item_price - b.item_price) // Ordenar por preço crescente
        .map(item => ({
          id: item.item_id,
          name: item.item_name,
          description: item.item_description,
          price: item.item_price,
          imageUrl: item.item_image_url,
          type: 'dish',
          category: null,
          city: null,
          restaurantName: item.restaurant_name, // Passando o nome do restaurante
          itemCategoryName: item.item_category_name, // Passando o nome da categoria do item
          itemCategoryId: item.item_category_id, // Passando o ID da categoria do item
        }));
    } else { // activeSearchType === 'restaurant'
      processedResults = (restaurantSearchResults || [])
        .filter(restaurant => {
          const distance = restaurant.distance_km;
          return maxDistanceFilter === null || distance <= maxDistanceFilter;
        })
        .sort((a, b) => b.distance_km - a.distance_km) // Ordenar por distância decrescente
        .map(restaurant => ({
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
          price: undefined,
          imageUrl: restaurant.image_url,
          type: 'restaurant',
          category: restaurant.category,
          city: restaurant.city,
          distance_km: restaurant.distance_km,
        }));
    }
    setDisplayedResults(processedResults);
  }, [
    activeSearchType,
    dishSearchResults,
    restaurantSearchResults,
    minPriceFilter,
    maxPriceFilter,
    maxDistanceFilter,
    excludedDishCategoryIds, // Add excludedDishCategoryIds to dependencies
    excludedRestaurantCategories, // Adicionado excludedRestaurantCategories
  ]);

  // Lógica de Busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto sua localização é definida para realizar a busca.");
      return;
    }
    // Aciona o refetch para ambos os tipos de busca com a query atual
    refetchDishes();
    refetchRestaurants();
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

  const handleApplyPriceFilter = (min: number, max: number) => {
    setMinPriceFilter(min);
    setMaxPriceFilter(max);
    showInfo(`Filtro de preço aplicado: R$${min.toFixed(2)} a R$${max.toFixed(2)}. Atualizando resultados.`);
    setIsPriceModalOpen(false);
    refetchDishes(); // Refetch dishes after applying price filter
  };

  const handleSearchNearby = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de distância.");
      return;
    }
    setIsDistanceModalOpen(true);
  };
  
  const handleApplyDistanceFilter = (distance: number) => {
    setMaxDistanceFilter(distance);
    showInfo(`Filtro de distância aplicado: até ${distance} km. Atualizando resultados.`);
    setIsDistanceModalOpen(false);
    refetchRestaurants(); // Refetch restaurants after applying distance filter
  };

  const handleApplyDishCategoryFilter = (newExcludedIds: string[]) => { // Renomeado
    setExcludedDishCategoryIds(newExcludedIds);
    showInfo(`Filtro de categorias de pratos aplicado. Atualizando resultados.`);
    refetchDishes(); // Refetch dishes after applying category filter
  };

  const handleApplyRestaurantCategoryFilter = (newExcludedCategories: string[]) => { // Novo handler
    setExcludedRestaurantCategories(newExcludedCategories);
    showInfo(`Filtro de categorias de restaurantes aplicado. Atualizando resultados.`);
    refetchRestaurants(); // Refetch restaurants after applying category filter
  };

  const toggleType = activeSearchType === 'dish' ? 'dishes' : 'restaurants';
  const handleToggleChange = (type: 'dishes' | 'restaurants') => {
    setActiveSearchType(type === 'dishes' ? 'dish' : 'restaurant');
    // Resetar filtros de preço/distância/categorias ao trocar de aba
    setMinPriceFilter(null);
    setMaxPriceFilter(null);
    setMaxDistanceFilter(null);
    setExcludedDishCategoryIds([]); // Limpa filtro de pratos
    setExcludedRestaurantCategories([]); // Limpa filtro de restaurantes
  };
  
  const handleBack = () => {
    navigate(-1);
  };

  // Extrair categorias únicas de restaurantes para o filtro
  const allRestaurantCategories = useMemo(() => {
    const categories = new Set<string>();
    restaurantSearchResults?.forEach(r => {
      if (r.category) {
        categories.add(r.category);
      }
    });
    return Array.from(categories).map(cat => ({ id: cat, name: cat })); // Adaptar para o formato esperado pelo CategoryFilterDrawer
  }, [restaurantSearchResults]);

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
          type="submit"
          size="icon" 
          variant="highlight" 
          className="h-12 w-12 rounded-xl shrink-0 bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </form>
      
      {/* Ações Rápidas (Filtros) - Transformadas em Chips Elegantes */}
      <div className="flex gap-2">
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

      {/* Resultados da Busca e Botão de Filtro */}
      <div className="flex items-center justify-between"> {/* Contêiner flexível para alinhar título e botão */}
        <h2 className="text-xl font-bold text-primary">
          Resultados da Busca
        </h2>
        {activeSearchType === 'dish' && (
          <CategoryFilterDrawer
            selectedCategoryIds={excludedDishCategoryIds}
            onApply={handleApplyDishCategoryFilter}
            allCategories={allMenuCategories}
          />
        )}
        {activeSearchType === 'restaurant' && (
          <CategoryFilterDrawer
            selectedCategoryIds={excludedRestaurantCategories}
            onApply={handleApplyRestaurantCategoryFilter}
            allCategories={allRestaurantCategories}
          />
        )}
      </div>

      <motion.div
        key={activeSearchType}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <div className="space-y-3">
          {resultsLoading ? (
            // Skeletons para o estado de carregamento
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))
          ) : displayedResults.length > 0 ? (
            displayedResults.map((item) => (
              <SearchItemCard 
                key={item.id} 
                item={item} 
                onClick={handleItemClick}
              />
            ))
          ) : (
            <Card className="p-6 text-center shadow-soft-md border-none rounded-xl">
              <Pizza className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum resultado encontrado. Tente ajustar sua busca ou filtros.</p>
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
      
      <main className="flex-1 w-full max-w-md mx-auto pb-20">
        {pageContent}
      </main>
    </>
  );
}