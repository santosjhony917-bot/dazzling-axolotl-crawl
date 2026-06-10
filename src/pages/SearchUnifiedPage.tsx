import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import Header from '@/components/Header';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { useUserRole } from '@/hooks/useUserRole';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchItems, SearchItemResult } from '@/hooks/useSearchItems';
import { useNearbyRestaurants, RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';
import CategoryFilterDrawer from '@/components/search/CategoryFilterDrawer';
import { useMenuCategories } from '@/hooks/useMenuCategories';
import { cn } from '@/lib/utils';
import SoftSearchInput from '@/components/search/SoftSearchInput';

type SearchType = 'dish' | 'restaurant';

interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  price?: number;
  imageUrl: string | null;
  type: 'dish' | 'restaurant';
  category?: string | null;
  city?: string | null;
  distance_km?: number;
  restaurantName?: string | null;
  itemCategoryName?: string | null;
  itemCategoryId?: string;
}

export default function SearchUnifiedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, restaurant } = useAuthData();
  const { isPremium } = useUserRole();
  const isRestaurantOwner = !!restaurant;
  
  const { location, isLoading: isLocationLoading } = useUserSearchLocation();
  const { categories: allMenuCategories, isLoading: categoriesLoading } = useMenuCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchType, setActiveSearchType] = useState<SearchType>('dish');
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

  const [minPriceFilter, setMinPriceFilter] = useState<number | null>(null);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number | null>(null);
  const [excludedDishCategoryIds, setExcludedDishCategoryIds] = useState<string[]>([]);
  const [includedRestaurantCategories, setIncludedRestaurantCategories] = useState<string[]>([]); // Alterado para categorias INCLUÍDAS

  const userLat = location.latitude;
  const userLon = location.longitude;

  const [page, setPage] = useState(1); // Estado para a página atual
  const pageSize = 10; // Número de itens por página

  // New states for accumulated results
  const [accumulatedDishResults, setAccumulatedDishResults] = useState<SearchItemResult[]>([]);
  const [accumulatedRestaurantResults, setAccumulatedRestaurantResults] = useState<RestaurantWithDistance[]>([]);

  // Efeito para ler os parâmetros da URL e inicializar os estados
  useEffect(() => {
    const urlSearchQuery = searchParams.get('searchQuery') || '';
    const urlMinPrice = searchParams.get('minPrice');
    const urlMaxPrice = searchParams.get('maxPrice');
    const urlMaxDistance = searchParams.get('maxDistance');
    const urlExcludedCategoryIds = searchParams.get('excludedCategoryIds');
    const urlIncludedCategories = searchParams.get('includedCategories');
    const urlSearchType = (searchParams.get('searchType') as SearchType) || 'dish';

    setSearchQuery(urlSearchQuery);
    setActiveSearchType(urlSearchType);
    setMinPriceFilter(urlMinPrice ? parseFloat(urlMinPrice) : null);
    setMaxPriceFilter(urlMaxPrice ? parseFloat(urlMaxPrice) : null);
    setMaxDistanceFilter(urlMaxDistance ? parseFloat(urlMaxDistance) : null);
    setExcludedDishCategoryIds(urlExcludedCategoryIds ? urlExcludedCategoryIds.split(',') : []);
    setIncludedRestaurantCategories(urlIncludedCategories ? urlIncludedCategories.split(',') : []);
    setPage(1); // Resetar a página ao carregar da URL
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
  }, [searchParams]);

  const {
    items: dishSearchResults,
    loading: dishesLoading,
    error: dishesError,
    refetch: refetchDishes,
    hasMore: dishesHasMore, // Get hasMore from hook
  } = useSearchItems({
    searchQuery,
    enabled: activeSearchType === 'dish' && !isLocationLoading && userLat !== null && userLon !== null,
    limit: pageSize, // Fetch only one page at a time
    offset: (page - 1) * pageSize, // Calculate offset based on current page
    excludedCategoryIds: excludedDishCategoryIds,
  });

  const {
    data: restaurantSearchResults,
    isLoading: restaurantsLoading,
    error: restaurantsError,
    refetch: refetchRestaurants,
    hasMore: restaurantsHasMore, // Get hasMore from hook
  } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: activeSearchType === 'restaurant' && !isLocationLoading && userLat !== null && userLon !== null,
    searchQuery,
    includedCategories: includedRestaurantCategories,
    limit: pageSize, // Fetch only one page at a time
    offset: (page - 1) * pageSize, // Calculate offset based on current page
  });

  const [displayedResults, setDisplayedResults] = useState<SearchItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true); // State to control if there are more items

  useEffect(() => {
    const isActiveLoading = activeSearchType === 'dish' ? dishesLoading : restaurantsLoading;
    setResultsLoading(isLocationLoading || isActiveLoading);
  }, [isLocationLoading, dishesLoading, restaurantsLoading, activeSearchType]);

  // Effect to accumulate dish results
  useEffect(() => {
    if (activeSearchType === 'dish' && !dishesLoading && dishSearchResults) {
      setAccumulatedDishResults(prev => {
        if (page === 1) {
          return dishSearchResults;
        }
        // Filter out items that are already in the accumulated list to prevent duplicates
        const newItems = dishSearchResults.filter(newItem => !prev.some(existingItem => existingItem.item_id === newItem.item_id));
        return [...prev, ...newItems];
      });
      setHasMore(dishesHasMore);
    }
  }, [activeSearchType, dishSearchResults, dishesLoading, page, dishesHasMore]);

  // Effect to accumulate restaurant results
  useEffect(() => {
    if (activeSearchType === 'restaurant' && !restaurantsLoading && restaurantSearchResults) {
      setAccumulatedRestaurantResults(prev => {
        if (page === 1) {
          return restaurantSearchResults;
        }
        // Filter out restaurants that are already in the accumulated list to prevent duplicates
        const newRestaurants = restaurantSearchResults.filter(newRest => !prev.some(existingRest => existingRest.id === newRest.id));
        return [...prev, ...newRestaurants];
      });
      setHasMore(restaurantsHasMore);
    }
  }, [activeSearchType, restaurantSearchResults, restaurantsLoading, page, restaurantsHasMore]);

  // Effect to apply filters to accumulated results and set displayedResults
  useEffect(() => {
    let processedResults: SearchItem[] = [];
    
    if (activeSearchType === 'dish') {
      processedResults = accumulatedDishResults
        .filter(item => {
          const price = item.item_price;
          const matchesMinPrice = minPriceFilter === null || price >= minPriceFilter;
          const matchesMaxPrice = maxPriceFilter === null || price <= maxPriceFilter;
          return matchesMinPrice && matchesMaxPrice;
        })
        .map(item => ({
          id: item.item_id,
          name: item.item_name,
          description: item.item_description,
          price: item.item_price,
          imageUrl: item.item_image_url,
          type: 'dish',
          category: null,
          city: null,
          restaurantName: item.restaurant_name,
          itemCategoryName: item.item_category_name,
          itemCategoryId: item.item_category_id,
        }));
    } else { // activeSearchType === 'restaurant'
      processedResults = (accumulatedRestaurantResults || [])
        .filter(restaurant => {
          const distance = restaurant.distance_km;
          return maxDistanceFilter === null || distance <= maxDistanceFilter;
        })
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
          neighborhood: restaurant.neighborhood,
        }));
    }
    setDisplayedResults(processedResults);
  }, [
    activeSearchType,
    accumulatedDishResults,
    accumulatedRestaurantResults,
    minPriceFilter,
    maxPriceFilter,
    maxDistanceFilter,
    excludedDishCategoryIds, // This filter is applied in the hook now
    includedRestaurantCategories, // This filter is applied in the hook now
  ]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto sua localização é definida para realizar a busca.");
      return;
    }
    setPage(1); // Resetar a página para 1 ao fazer uma nova busca
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchDishes(); // This will trigger a fetch for page 1
    refetchRestaurants(); // This will trigger a fetch for page 1
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
    setPage(1); // Resetar a página ao aplicar filtro
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchDishes(); // Refetch with new price filter
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
    setPage(1); // Resetar a página ao aplicar filtro
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchRestaurants(); // Refetch with new distance filter
  };

  const handleApplyDishCategoryFilter = (newExcludedIds: string[]) => {
    setExcludedDishCategoryIds(newExcludedIds);
    showInfo(`Filtro de categorias de pratos aplicado. Atualizando resultados.`);
    setPage(1); // Resetar a página ao aplicar filtro
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchDishes(); // Refetch with new category filter
  };

  const handleApplyRestaurantCategoryFilter = (newIncludedCategories: string[]) => {
    setIncludedRestaurantCategories(newIncludedCategories);
    showInfo(`Filtro de categorias de restaurantes aplicado. Atualizando resultados.`);
    setPage(1); // Resetar a página ao aplicar filtro
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchRestaurants(); // Refetch with new category filter
  };

  const toggleType = activeSearchType === 'dish' ? 'dishes' : 'restaurants';
  const handleToggleChange = (type: 'dishes' | 'restaurants') => {
    setActiveSearchType(type === 'dishes' ? 'dish' : 'restaurant');
    // Resetar filtros e página ao trocar de aba
    setMinPriceFilter(null);
    setMaxPriceFilter(null);
    setMaxDistanceFilter(null);
    setExcludedDishCategoryIds([]);
    setIncludedRestaurantCategories([]);
    setPage(1);
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
  };
  
  const handleBack = () => {
    navigate(-1);
  };

  const allRestaurantCategories = useMemo(() => {
    const categories = new Set<string>();
    // Usar todos os resultados carregados para popular as categorias
    accumulatedRestaurantResults?.forEach(r => { // Use accumulated results
      if (r.category) {
        categories.add(r.category);
      }
    });
    return Array.from(categories).map(cat => ({ id: cat, name: cat }));
  }, [accumulatedRestaurantResults]); // Depend on accumulated results

  const handleLoadMore = () => {
    console.log('handleLoadMore called. Current page:', page, 'Next page:', page + 1);
    setPage(prevPage => prevPage + 1);
  };

  const handleClearFilters = () => {
    setMinPriceFilter(null);
    setMaxPriceFilter(null);
    setMaxDistanceFilter(null);
    setExcludedDishCategoryIds([]);
    setIncludedRestaurantCategories([]);
    setPage(1);
    setAccumulatedDishResults([]);
    setAccumulatedRestaurantResults([]);
  };

  const hasActiveFilters = minPriceFilter !== null || maxPriceFilter !== null || maxDistanceFilter !== null;

  const pageContent = (
    <div className="px-5 pb-5 pt-4 space-y-4">

      {/* Filtros Rápidos — estilo pill compacto */}
      <div className="flex gap-2 flex-wrap">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={handleSearchByPrice}
          className={cn(
            'h-[38px] px-4 rounded-full flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-200 border',
            minPriceFilter !== null || maxPriceFilter !== null
              ? 'bg-[#EF2A39] text-white border-[#EF2A39] shadow-[0_4px_12px_rgba(239,42,57,0.30)]'
              : 'bg-white text-[#6A6A6A] border-[#E5E7EB] shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:border-[#EF2A39]/40'
          )}
        >
          <DollarSign className="w-3.5 h-3.5" />
          {minPriceFilter !== null || maxPriceFilter !== null
            ? `R$${minPriceFilter || 0}–R$${maxPriceFilter || '∞'}`
            : 'Preço'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={handleSearchNearby}
          className={cn(
            'h-[38px] px-4 rounded-full flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-200 border',
            maxDistanceFilter !== null
              ? 'bg-[#EF2A39] text-white border-[#EF2A39] shadow-[0_4px_12px_rgba(239,42,57,0.30)]'
              : 'bg-white text-[#6A6A6A] border-[#E5E7EB] shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:border-[#EF2A39]/40'
          )}
        >
          <Compass className="w-3.5 h-3.5" />
          {maxDistanceFilter !== null ? `Até ${maxDistanceFilter} km` : 'Distância'}
        </motion.button>

        {hasActiveFilters && (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleClearFilters}
            className="h-[38px] px-4 rounded-full flex items-center gap-1.5 text-[13px] font-semibold bg-[#FEE2E2] text-[#EF2A39] border border-[#FECACA] transition-all duration-200"
          >
            ✕ Limpar
          </motion.button>
        )}
      </div>

      <SearchToggle activeType={toggleType} onToggle={handleToggleChange} />

      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-[#3C2F2F] tracking-tight">
          Resultados da Busca
        </h2>
        {activeSearchType === 'dish' && (
          <CategoryFilterDrawer
            selectedCategoryIds={excludedDishCategoryIds}
            onApply={handleApplyDishCategoryFilter}
            allCategories={allMenuCategories}
            filterMode="exclude"
          />
        )}
        {activeSearchType === 'restaurant' && (
          <CategoryFilterDrawer
            selectedCategoryIds={includedRestaurantCategories}
            onApply={handleApplyRestaurantCategoryFilter}
            allCategories={allRestaurantCategories}
            filterMode="include"
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
          {resultsLoading && displayedResults.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))
          ) : displayedResults.length > 0 ? (
            <>
              {displayedResults.map((item) => (
                <SearchItemCard 
                  key={item.id} 
                  item={item} 
                  onClick={handleItemClick}
                />
              ))}
              {hasMore && (
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full h-11 rounded-2xl border-gray-300 text-slate-700 hover:bg-highlight/10 shadow-none transition-all mt-4 text-xs font-bold"
                  disabled={
                    (activeSearchType === 'dish' && dishesLoading) ||
                    (activeSearchType === 'restaurant' && restaurantsLoading)
                  }
                >
                  {((activeSearchType === 'dish' && dishesLoading) ||
                   (activeSearchType === 'restaurant' && restaurantsLoading)) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Ver Mais
                </Button>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-14 px-6 text-center"
            >
              {/* Ilustração emoji grande */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FFF1F1] to-[#FFE4E4] flex items-center justify-center mb-5 shadow-[0_8px_24px_rgba(239,42,57,0.12)]">
                <span className="text-5xl">🍽️</span>
              </div>
              <h2 className="text-[20px] font-bold text-[#3C2F2F] mb-2">Hmm, não achamos nada...</h2>
              <p className="text-[14px] text-[#9CA3AF] font-medium leading-relaxed mb-6">
                Tente usar palavras diferentes ou remover os filtros aplicados.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="h-[46px] px-8 rounded-[20px] bg-[#EF2A39] text-white font-semibold text-[15px] shadow-[0_6px_18px_rgba(239,42,57,0.30)] active:scale-95 transition-transform"
                >
                  Limpar filtros
                </button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
      
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(e);
  };

  return (
    <div className="flex flex-col w-full flex-grow bg-[#FAFAFA] font-['Poppins']">
      {/* Cabeçalho customizado */}
      <div className="px-5 pt-6 pb-4 bg-white">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-[#F1F3F5] flex items-center justify-center text-[#3C2F2F] hover:bg-[#E5E7EB] active:scale-90 transition-all"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-[22px] font-bold text-[#3C2F2F] leading-tight">Buscar</h1>
            <p className="text-[13px] text-[#9CA3AF] font-medium leading-none mt-0.5">Encontre pratos e restaurantes</p>
          </div>
        </div>

        {/* Search input */}
        <div className="mt-4 relative z-20">
          <SoftSearchInput
            placeholder={activeSearchType === 'dish' ? "Buscar por prato..." : "Buscar por restaurante..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSubmitAction={handleSearchSubmit}
          />
        </div>
      </div>

      <div className="flex-grow w-full">
        {pageContent}
      </div>
    </div>
  );
}