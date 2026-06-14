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
import AdvancedFilterDrawer from '@/components/search/AdvancedFilterDrawer';
import { useMenuCategories } from '@/hooks/useMenuCategories';
import { cn } from '@/lib/utils';
import SoftSearchInput from '@/components/search/SoftSearchInput';
import { parseSearchQuery } from '@/utils/searchParser';
import { getRestaurantOpenStatus } from '@/lib/schedule';

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
  opening_hours?: any;
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
  const [selectedNeighborhoodFilter, setSelectedNeighborhoodFilter] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const userLat = location.latitude;
  const userLon = location.longitude;

  const [page, setPage] = useState(1); // Estado para a página atual
  const pageSize = 10; // Número de itens por página

  // New states for accumulated results
  const [accumulatedDishResults, setAccumulatedDishResults] = useState<SearchItemResult[]>([]);
  const [accumulatedRestaurantResults, setAccumulatedRestaurantResults] = useState<RestaurantWithDistance[]>([]);

  // NLP Search query parsing
  const parsedQuery = useMemo(() => {
    return parseSearchQuery(searchQuery);
  }, [searchQuery]);

  const dbSearchQuery = useMemo(() => {
    if (!searchQuery) return '';
    return parsedQuery.cleanedQuery || parsedQuery.category || '';
  }, [searchQuery, parsedQuery]);

  // Efeito para ler os parâmetros da URL e inicializar os estados
  useEffect(() => {
    const urlSearchQuery = searchParams.get('searchQuery') || '';
    const urlMinPrice = searchParams.get('minPrice');
    const urlMaxPrice = searchParams.get('maxPrice');
    const urlMaxDistance = searchParams.get('maxDistance');
    const urlExcludedCategoryIds = searchParams.get('excludedCategoryIds');
    const urlIncludedCategories = searchParams.get('includedCategories');
    const urlSearchType = (searchParams.get('searchType') as SearchType) || 'dish';
    const urlNeighborhood = searchParams.get('neighborhood');

    setSearchQuery(urlSearchQuery);
    setActiveSearchType(urlSearchType);
    setMinPriceFilter(urlMinPrice ? parseFloat(urlMinPrice) : null);
    setMaxPriceFilter(urlMaxPrice ? parseFloat(urlMaxPrice) : null);
    setMaxDistanceFilter(urlMaxDistance ? parseFloat(urlMaxDistance) : null);
    setExcludedDishCategoryIds(urlExcludedCategoryIds ? urlExcludedCategoryIds.split(',') : []);
    setIncludedRestaurantCategories(urlIncludedCategories ? urlIncludedCategories.split(',') : []);
    setSelectedNeighborhoodFilter(urlNeighborhood);
    setPage(1); // Resetar a página ao carregar da URL
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    
    if (urlSearchQuery || urlNeighborhood || urlMinPrice || urlMaxPrice || urlExcludedCategoryIds || urlIncludedCategories) {
      setIsSubmitted(true);
    } else {
      setIsSubmitted(false);
    }
  }, [searchParams]);

  const isSearchEnabled = isSubmitted && !isLocationLoading && userLat !== null && userLon !== null;

  const {
    items: dishSearchResults,
    loading: dishesLoading,
    error: dishesError,
    refetch: refetchDishes,
    hasMore: dishesHasMore, // Get hasMore from hook
  } = useSearchItems({
    searchQuery: dbSearchQuery,
    enabled: activeSearchType === 'dish' && isSearchEnabled,
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
    enabled: activeSearchType === 'restaurant' && isSearchEnabled,
    searchQuery: dbSearchQuery,
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

  // Group João Pessoa neighborhoods by region
  const REGIONS_NEIGHBORHOODS = useMemo(() => ({
    orla: ['Tambaú', 'Cabo Branco', 'Manaíra', 'Bessa', 'Altiplano', 'Jardim Oceania', 'Aeroclube'],
    zona_sul: ['Bancários', 'Mangabeira', 'Geisel', 'Valentina', 'Castelo Branco', 'Portal do Sol', 'José Américo', 'Cidade Universitária'],
    centro_norte: ['Centro', 'Torre', 'Tambiá', 'Bairro dos Estados', 'Jaguaribe', 'Mandacaru', 'Roger', 'Padre Zé', 'Miramar', 'Tambauzinho', 'Expedicionários']
  }), []);

  // Effect to apply filters to accumulated results and set displayedResults
  useEffect(() => {
    let processedResults: SearchItem[] = [];
    
    // Neighborhood filters: either manually selected or parsed via NLP
    const activeNeighborhood = selectedNeighborhoodFilter || parsedQuery.neighborhood;
    
    const matchesNeighborhood = (itemNeigh: string | null | undefined) => {
      if (!activeNeighborhood) return true;
      if (!itemNeigh) return false;
      const normItem = itemNeigh.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normFilter = activeNeighborhood.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normItem.includes(normFilter) || normFilter.includes(normItem);
    };

    const matchesRegion = (itemNeigh: string | null | undefined) => {
      if (!parsedQuery.regionId) return true;
      if (!itemNeigh) return false;
      const neighborhoods = REGIONS_NEIGHBORHOODS[parsedQuery.regionId as keyof typeof REGIONS_NEIGHBORHOODS] || [];
      const normItem = itemNeigh.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return neighborhoods.some(neigh => {
        const normNeigh = neigh.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normItem.includes(normNeigh) || normNeigh.includes(normItem);
      });
    };

    const matchesCategory = (item: any) => {
      if (!parsedQuery.category) return true;
      const normFilter = parsedQuery.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (activeSearchType === 'dish') {
        const catName = (item.item_category_name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const restCat = (item.restaurant_category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const itemName = (item.item_name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return catName.includes(normFilter) || restCat.includes(normFilter) || itemName.includes(normFilter);
      } else {
        const restCat = (item.category || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const restName = (item.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return restCat.includes(normFilter) || restName.includes(normFilter);
      }
    };

    const isRestaurantOpen = (openingHours: any) => {
      if (openingHours) {
        try {
          const status = getRestaurantOpenStatus(openingHours);
          return status.isOpen;
        } catch (e) {
          // Fallback
        }
      }
      const hour = new Date().getHours();
      return hour >= 11 && hour < 22;
    };

    if (activeSearchType === 'dish') {
      processedResults = accumulatedDishResults
        .filter(item => {
          const price = item.item_price;
          const matchesMinPrice = minPriceFilter === null || price >= minPriceFilter;
          const matchesMaxPrice = maxPriceFilter === null || price <= maxPriceFilter;
          const neighMatches = matchesNeighborhood(item.restaurant_neighborhood);
          const regionMatches = matchesRegion(item.restaurant_neighborhood);
          const categoryMatches = matchesCategory(item);
          return matchesMinPrice && matchesMaxPrice && neighMatches && regionMatches && categoryMatches;
        })
        .map(item => ({
          id: item.item_id,
          name: item.item_name,
          description: item.item_description,
          price: item.item_price,
          imageUrl: item.item_image_url,
          type: 'dish',
          category: item.restaurant_category,
          city: null,
          restaurantName: item.restaurant_name,
          itemCategoryName: item.item_category_name,
          itemCategoryId: item.item_category_id,
          neighborhood: item.restaurant_neighborhood,
          opening_hours: item.restaurant_opening_hours,
        }));
    } else { // activeSearchType === 'restaurant'
      processedResults = (accumulatedRestaurantResults || [])
        .filter(restaurant => {
          const distance = restaurant.distance_km;
          const matchesDistance = maxDistanceFilter === null || distance <= maxDistanceFilter;
          const neighMatches = matchesNeighborhood(restaurant.neighborhood);
          const regionMatches = matchesRegion(restaurant.neighborhood);
          const categoryMatches = matchesCategory(restaurant);
          return matchesDistance && neighMatches && regionMatches && categoryMatches;
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
          opening_hours: restaurant.opening_hours,
        }));
    }

    // Priorizar abertos
    processedResults.sort((a, b) => {
      const aOpen = isRestaurantOpen(a.opening_hours);
      const bOpen = isRestaurantOpen(b.opening_hours);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return 0;
    });

    setDisplayedResults(processedResults);
  }, [
    activeSearchType,
    accumulatedDishResults,
    accumulatedRestaurantResults,
    minPriceFilter,
    maxPriceFilter,
    maxDistanceFilter,
    selectedNeighborhoodFilter,
    parsedQuery,
    REGIONS_NEIGHBORHOODS
  ]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto sua localização é definida para realizar a busca.");
      return;
    }
    setIsSubmitted(true);
    setPage(1); // Resetar a página para 1 ao fazer uma nova busca
    setAccumulatedDishResults([]); // Clear accumulated results
    setAccumulatedRestaurantResults([]); // Clear accumulated results
    refetchDishes(); // This will trigger a fetch for page 1
    refetchRestaurants(); // This will trigger a fetch for page 1
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsSubmitted(false);
  };

  const handleSuggestionClick = (queryText: string) => {
    setSearchQuery(queryText);
    setIsSubmitted(true);
    setPage(1);
    setAccumulatedDishResults([]);
    setAccumulatedRestaurantResults([]);
  };

  // Predefined search suggestion combos mapping João Pessoa neighborhood and categories
  const SUGGESTED_COMBOS = useMemo(() => [
    { text: '🍕 Pizzaria em Tambaú', query: 'Pizzaria em Tambaú' },
    { text: '🍔 Hamburgueria nos Bancários', query: 'Hamburgueria nos Bancários' },
    { text: '🏖️ Restaurantes na Orla', query: 'Restaurantes na Orla' },
    { text: '🥩 Churrasco no Centro', query: 'Churrasco no Centro' },
    { text: '🍦 Sorvete em Cabo Branco', query: 'Sorvete em Cabo Branco' },
    { text: '🍣 Sushi em Manaíra', query: 'Sushi em Manaíra' },
    { text: '☕ Café em Tambaú', query: 'Café em Tambaú' },
    { text: '🍧 Açaí em Mangabeira', query: 'Açaí em Mangabeira' }
  ], []);

  // Predictive autocompletes based on typed content mapping João Pessoa details local parser
  const generateAutocompleteSuggestions = useCallback((query: string) => {
    const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!normalized) return [];

    const suggestionsList: { text: string; query: string; type: 'category' | 'neighborhood' | 'combo' | 'general' }[] = [];

    // Mappings from searchParser
    const NEIGHBORHOODS_LIST = [
      'Tambaú', 'Cabo Branco', 'Manaíra', 'Bessa', 'Bancários', 'Mangabeira', 
      'Geisel', 'Valentina', 'Centro', 'Torre', 'Altiplano', 'Tambiá', 
      'Bairro dos Estados', 'Jaguaribe', 'Mandacaru', 'Roger', 'Padre Zé', 
      'Miramar', 'Tambauzinho', 'Jardim Oceania', 'Aeroclube', 'Castelo Branco', 
      'Portal do Sol', 'José Américo', 'Cidade Universitária', 'Expedicionários'
    ];

    const CATEGORIES_LIST = [
      { key: 'pizza', label: 'Pizzaria' },
      { key: 'hamburguer', label: 'Hamburgueria' },
      { key: 'sushi', label: 'Japonesa' },
      { key: 'cafe', label: 'Cafeteria' },
      { key: 'churrasco', label: 'Churrascaria' },
      { key: 'sorvete', label: 'Açaí / Sorveteria' },
      { key: 'saudavel', label: 'Saudável / Fit' }
    ];

    const REGIONS_LIST = [
      { key: 'orla', label: 'Orla' },
      { key: 'praia', label: 'Orla' },
      { key: 'zona sul', label: 'Zona Sul' },
      { key: 'centro', label: 'Centro / Norte' }
    ];

    // Find matches
    const matchedCats = CATEGORIES_LIST.filter(c => c.key.includes(normalized) || c.label.toLowerCase().includes(normalized));
    const matchedNeighs = NEIGHBORHOODS_LIST.filter(n => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalized));
    const matchedRegions = REGIONS_LIST.filter(r => r.key.includes(normalized) || r.label.toLowerCase().includes(normalized));

    if (matchedCats.length > 0) {
      const categoryName = matchedCats[0].label;
      suggestionsList.push({
        text: `🔍 Buscar por ${categoryName}`,
        query: categoryName,
        type: 'category'
      });
      // Add popular neighborhood combos for category
      ['Tambaú', 'Cabo Branco', 'Bancários', 'Manaíra'].forEach(neigh => {
        suggestionsList.push({
          text: `🔍 ${categoryName} em ${neigh}`,
          query: `${categoryName} em ${neigh}`,
          type: 'combo'
        });
      });
    }

    if (matchedNeighs.length > 0) {
      matchedNeighs.slice(0, 2).forEach(neighName => {
        suggestionsList.push({
          text: `📍 Ir para ${neighName}`,
          query: neighName,
          type: 'neighborhood'
        });
        // Add popular category combos
        ['Pizzaria', 'Hamburgueria', 'Cafeteria', 'Açaí / Sorveteria'].forEach(cat => {
          suggestionsList.push({
            text: `🔍 ${cat} em ${neighName}`,
            query: `${cat} em ${neighName}`,
            type: 'combo'
          });
        });
      });
    }

    if (matchedRegions.length > 0) {
      const regionLabel = matchedRegions[0].label;
      suggestionsList.push({
        text: `🏖️ Restaurantes na ${regionLabel}`,
        query: `Restaurantes na ${regionLabel}`,
        type: 'combo'
      });
      suggestionsList.push({
        text: `🍔 Hamburgueria na ${regionLabel}`,
        query: `Hamburgueria na ${regionLabel}`,
        type: 'combo'
      });
    }

    // Parse to see if it's already a combo (NLP)
    const parsed = parseSearchQuery(query);
    if (parsed.category && parsed.neighborhood) {
      suggestionsList.unshift({
        text: `✨ Buscar ${parsed.category} em ${parsed.neighborhood}`,
        query: `${parsed.category} em ${parsed.neighborhood}`,
        type: 'combo'
      });
    } else if (parsed.cleanedQuery && parsed.neighborhood) {
      suggestionsList.unshift({
        text: `✨ Buscar "${parsed.cleanedQuery}" em ${parsed.neighborhood}`,
        query: `${parsed.cleanedQuery} em ${parsed.neighborhood}`,
        type: 'combo'
      });
    }

    suggestionsList.push({
      text: `🔍 Buscar por "${query}"`,
      query: query,
      type: 'general'
    });

    const seenText = new Set<string>();
    return suggestionsList.filter(item => {
      if (seenText.has(item.text)) return false;
      seenText.add(item.text);
      return true;
    }).slice(0, 6);
  }, []);
  
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

  const handleApplyPrice = (min: number | null, max: number | null) => {
    setMinPriceFilter(min);
    setMaxPriceFilter(max);
    setPage(1);
    setAccumulatedDishResults([]);
    setAccumulatedRestaurantResults([]);
  };

  const handleApplyNeighborhood = (neighborhood: string | null) => {
    setSelectedNeighborhoodFilter(neighborhood);
    setPage(1);
    setAccumulatedDishResults([]);
    setAccumulatedRestaurantResults([]);
  };

  const toggleType = activeSearchType === 'dish' ? 'dishes' : 'restaurants';
  const handleToggleChange = (type: 'dishes' | 'restaurants') => {
    setActiveSearchType(type === 'dishes' ? 'dish' : 'restaurant');
    // Resetar filtros e página ao trocar de aba
    setMinPriceFilter(null);
    setMaxPriceFilter(null);
    setMaxDistanceFilter(null);
    setSelectedNeighborhoodFilter(null);
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
    setSelectedNeighborhoodFilter(null);
    setExcludedDishCategoryIds([]);
    setIncludedRestaurantCategories([]);
    setPage(1);
    setAccumulatedDishResults([]);
    setAccumulatedRestaurantResults([]);
  };

  const hasActiveFilters = minPriceFilter !== null || maxPriceFilter !== null || maxDistanceFilter !== null || selectedNeighborhoodFilter !== null;

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

        {selectedNeighborhoodFilter !== null && (
          <div className="h-[38px] px-4 rounded-full flex items-center gap-1.5 text-[13px] font-semibold bg-[#EF2A39] text-white border border-[#EF2A39] shadow-[0_4px_12px_rgba(239,42,57,0.30)]">
            <MapPin className="w-3.5 h-3.5" />
            {selectedNeighborhoodFilter}
          </div>
        )}

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
          <AdvancedFilterDrawer
            selectedCategoryIds={excludedDishCategoryIds}
            onApplyCategories={handleApplyDishCategoryFilter}
            allCategories={allMenuCategories}
            selectedNeighborhood={selectedNeighborhoodFilter}
            onApplyNeighborhood={handleApplyNeighborhood}
            minPrice={minPriceFilter}
            maxPrice={maxPriceFilter}
            onApplyPrice={handleApplyPrice}
            filterMode="exclude"
          />
        )}
        {activeSearchType === 'restaurant' && (
          <AdvancedFilterDrawer
            selectedCategoryIds={includedRestaurantCategories}
            onApplyCategories={handleApplyRestaurantCategoryFilter}
            allCategories={allRestaurantCategories}
            selectedNeighborhood={selectedNeighborhoodFilter}
            onApplyNeighborhood={handleApplyNeighborhood}
            minPrice={minPriceFilter}
            maxPrice={maxPriceFilter}
            onApplyPrice={handleApplyPrice}
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

  const renderSuggestions = () => {
    if (searchQuery === '') {
      return (
        <div className="px-5 pt-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#3C2F2F]">
              <span className="text-[14px] font-bold tracking-wider uppercase opacity-75">
                Buscas Recomendadas por IA
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FFF1F1] text-[#EF2A39] font-bold">
                Novo
              </span>
            </div>
            <p className="text-[12px] text-[#9CA3AF] font-medium leading-tight">
              Combine pratos, categorias e bairros de João Pessoa em uma única busca natural.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {SUGGESTED_COMBOS.map((combo, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuggestionClick(combo.query)}
                  className="flex items-center justify-between p-4 rounded-[20px] bg-white border border-slate-100/80 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(239,42,57,0.08)] hover:border-[#EF2A39]/30 text-left transition-all duration-300"
                >
                  <span className="text-[14px] font-bold text-[#3C2F2F]">{combo.text}</span>
                  <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const autocompleteList = generateAutocompleteSuggestions(searchQuery);

    if (autocompleteList.length === 0) return null;

    return (
      <div className="px-5 pt-4 space-y-3">
        <h3 className="text-[12px] font-bold text-[#9CA3AF] tracking-wider uppercase pl-1">
          Sugestões de busca
        </h3>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.05)] overflow-hidden">
          {autocompleteList.map((item, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSuggestionClick(item.query)}
              className={cn(
                "w-full flex items-center justify-between p-4 text-left transition-all duration-150 border-b border-slate-50 last:border-0 hover:bg-slate-50/80",
                idx === 0 && "bg-[#FFF1F1]/30 hover:bg-[#FFF1F1]/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center",
                  item.type === 'neighborhood' ? "bg-red-50 text-[#EF2A39]" :
                  item.type === 'category' ? "bg-amber-50 text-amber-500" :
                  item.type === 'combo' ? "bg-emerald-50 text-emerald-500" : "bg-slate-50 text-slate-400"
                )}>
                  {item.type === 'neighborhood' ? (
                    <MapPin className="w-4 h-4" />
                  ) : item.type === 'category' ? (
                    <Pizza className="w-4 h-4" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <span className="text-[14px] font-semibold text-[#3C2F2F]">
                    {item.text}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full flex-grow bg-[#FAFAFA] font-['Poppins'] relative">
      {/* Cabeçalho customizado (Sticky no Topo) */}
      <div className="px-5 pt-6 pb-4 bg-white sticky top-0 z-30 border-b border-slate-100 shadow-sm w-full">
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
            onChange={(e) => handleInputChange(e.target.value)}
            onSubmitAction={handleSearchSubmit}
          />
        </div>
      </div>

      <div className="flex-grow w-full pb-8">
        {isSubmitted ? pageContent : renderSuggestions()}
      </div>
    </div>
  );
}