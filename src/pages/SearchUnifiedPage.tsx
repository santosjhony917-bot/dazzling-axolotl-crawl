import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils, ChevronRight, Filter, DollarSign, Compass, ArrowLeft, Pizza, Truck, CreditCard } from 'lucide-react';
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
import SearchByServiceTypeModal from '@/components/search/SearchByServiceTypeModal';
import SearchByPaymentMethodModal from '@/components/search/SearchByPaymentMethodModal';
import { useUserRole } from '@/hooks/useUserRole';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchItems, SearchItemResult } from '@/hooks/useSearchItems';
import { useNearbyRestaurants, RestaurantWithDistance } from '@/hooks/useNearbyRestaurants';
import CategoryFilterDrawer from '@/components/search/CategoryFilterDrawer';
import { useMenuCategories } from '@/hooks/useMenuCategories';

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
  const [isServiceTypeModalOpen, setIsServiceTypeModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);

  const [minPriceFilter, setMinPriceFilter] = useState<number | null>(null);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [maxDistanceFilter, setMaxDistanceFilter] = useState<number | null>(null);
  const [excludedDishCategoryIds, setExcludedDishCategoryIds] = useState<string[]>([]);
  const [includedRestaurantCategories, setIncludedRestaurantCategories] = useState<string[]>([]); // Alterado para categorias INCLUÍDAS

  const [serviceTypesFilter, setServiceTypesFilter] = useState({ delivery: false, presencial: false });
  const [paymentMethodsFilter, setPaymentMethodsFilter] = useState({
    pix: false,
    dinheiro: false,
    credito: false,
    debito: false,
    aleloRefeicao: false,
    sodexo: false,
  });

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
    setResultsLoading(isLocationLoading || dishesLoading || restaurantsLoading || categoriesLoading);
  }, [isLocationLoading, dishesLoading, restaurantsLoading, categoriesLoading]);

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
          itemCategoryName: item.category_name,
          itemCategoryId: item.category_id,
        }));
    } else { // activeSearchType === 'restaurant'
      processedResults = (accumulatedRestaurantResults || [])
        .filter(restaurant => {
          const distance = restaurant.distance_km;
          const matchesDistance = maxDistanceFilter === null || distance <= maxDistanceFilter;

          // Payment Methods Filter
          let matchesPayment = true;
          const selectedPaymentMethods = Object.entries(paymentMethodsFilter)
            .filter(([_, isSelected]) => isSelected)
            .map(([key]) => key);

          if (selectedPaymentMethods.length > 0 && restaurant.payment_methods) {
            // Assume payment_methods is an object or array. 
            // If it's an object like { pix: true, ... }, we check keys.
            // If it's an array like ['pix', ...], we check inclusion.
            const methods = restaurant.payment_methods as any;
            if (Array.isArray(methods)) {
              matchesPayment = selectedPaymentMethods.some(m => methods.includes(m));
            } else if (typeof methods === 'object' && methods !== null) {
              matchesPayment = selectedPaymentMethods.some(m => methods[m] === true);
            }
          }

          // Service Types Filter (Placeholder logic as data is missing)
          // We can check if 'delivery' or 'presencial' is in description or tags if available
          // For now, we won't filter strictly to avoid hiding valid results due to missing data

          return matchesDistance && matchesPayment;
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
    paymentMethodsFilter,
    serviceTypesFilter
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

  const handleSearchByServiceType = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de tipo de serviço.");
      return;
    }
    setIsServiceTypeModalOpen(true);
  };

  const handleApplyServiceTypeFilter = (selectedServiceTypes: { delivery: boolean, presencial: boolean }) => {
    setServiceTypesFilter(selectedServiceTypes);
    showInfo(`Filtro de tipo de serviço aplicado. Atualizando resultados.`);
    setIsServiceTypeModalOpen(false);
    setPage(1); // Resetar a página ao aplicar filtro
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchRestaurants(); // Refetch with new service type filter
  };

  const handleSearchByPaymentMethod = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de forma de pagamento.");
      return;
    }
    setIsPaymentMethodModalOpen(true);
  };

  const handleApplyPaymentMethodFilter = (selectedPaymentMethods: {
    pix: boolean;
    dinheiro: boolean;
    credito: boolean;
    debito: boolean;
    aleloRefeicao: boolean;
    sodexo: boolean;
  }) => {
    setPaymentMethodsFilter(selectedPaymentMethods);
    showInfo(`Filtro de forma de pagamento aplicado. Atualizando resultados.`);
    setIsPaymentMethodModalOpen(false);
    setPage(1); // Resetar a página ao aplicar filtro
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchRestaurants(); // Refetch with new payment method filter
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

  const pageContent = (
    <div className="p-4 space-y-6">

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

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0">
          <Button
            onClick={handleSearchByPrice}
            variant="outline"
            className="h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all px-4"
          >
            <DollarSign className="w-5 h-5 mr-2 text-highlight" /> Preço
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0">
          <Button
            onClick={handleSearchNearby}
            variant="outline"
            className="h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all px-4"
          >
            <Compass className="w-5 h-5 mr-2 text-highlight" /> Distância
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0">
          <Button
            onClick={handleSearchByServiceType}
            variant="outline"
            className="h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all px-4"
          >
            <Truck className="w-5 h-5 mr-2 text-highlight" /> Serviço
          </Button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }} className="flex-shrink-0">
          <Button
            onClick={handleSearchByPaymentMethod}
            variant="outline"
            className="h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all px-4"
          >
            <CreditCard className="w-5 h-5 mr-2 text-highlight" /> Pagamento
          </Button>
        </motion.div>
      </div>

      <SearchToggle activeType={toggleType} onToggle={handleToggleChange} />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">
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
          {resultsLoading && displayedResults.length === 0 ? ( // Mostrar skeleton apenas se não houver resultados ainda
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
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
              {hasMore && ( // Mostrar botão "Ver Mais" se houver mais resultados
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-gray-300 text-primary hover:bg-highlight/10 shadow-soft-md transition-all mt-4"
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
            <Card className="p-6 text-center shadow-soft-md border-none rounded-xl">
              <Pizza className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum resultado encontrado. Tente ajustar sua busca ou filtros.</p>
            </Card>
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
      <SearchByServiceTypeModal
        isOpen={isServiceTypeModalOpen}
        onClose={() => setIsServiceTypeModalOpen(false)}
        onApplyFilter={handleApplyServiceTypeFilter}
        currentFilters={serviceTypesFilter}
      />
      <SearchByPaymentMethodModal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => setIsPaymentMethodModalOpen(false)}
        onApplyFilter={handleApplyPaymentMethodFilter}
        currentFilters={paymentMethodsFilter}
      />
    </div>
  );

  return (
    <>
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-primary text-xl font-bold">Busca</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto pb-20">
        {pageContent}
      </main>
    </>
  );
}