import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Compass,
  DollarSign,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import Header from '@/components/Header';
import SearchToggle from '@/components/SearchToggle';
import AdvancedFilterDrawer from '@/components/search/AdvancedFilterDrawer';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchItemCard from '@/components/search/SearchItemCard';
import SoftSearchInput from '@/components/search/SoftSearchInput';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DiscoveryStatePanel, IntentSummary } from '@/features/menu-assistant/components';
import {
  menuIntentCacheKey,
  menuIntentFromSearchParams,
  menuIntentToSearchParams,
  parseMenuSearchIntent,
  useMenuDiscoverySession,
} from '@/features/menu-assistant';
import type {
  MenuDiscoveryResult,
  MenuSearchIntent,
  MenuSearchIntentPatch,
  MenuSearchLocation,
  UnappliedCriterion,
} from '@/features/menu-assistant';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { showError, showInfo } from '@/utils/toast';

type SearchType = 'dish' | 'restaurant';

interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  price?: number;
  priceType?: string | null;
  displayPrice?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  commercialType?: string | null;
  isConfigurable?: boolean | null;
  imageUrl: string | null;
  type: SearchType;
  category?: string | null;
  city?: string | null;
  distance_km?: number;
  restaurantName?: string | null;
  itemCategoryName?: string | null;
  itemCategoryId?: string;
  neighborhood?: string | null;
}

const PAGE_LIMIT = 20;
const EXPANDED_LIMIT = 50;

const SUGGESTED_SEARCHES = [
  'Pizza para 2 pessoas até R$ 100',
  'Hambúrguer até R$ 30',
  'Salada vegetariana até R$ 40',
  'Sushi sem cream cheese',
] as const;

const ACTIVE_REQUEST_STATUSES = new Set([
  'checking_coverage',
  'parsing',
  'searching',
  'rewriting',
]);

const criterionLabels: Record<UnappliedCriterion, string> = {
  query: 'termos da pergunta',
  category: 'categoria',
  price: 'preço',
  people: 'quantidade de pessoas',
  restriction: 'restrição alimentar',
  excluded_ingredient: 'ingrediente excluído',
  distance: 'distância',
  city: 'cidade',
  region: 'região',
  neighborhood: 'bairro',
  occasion: 'ocasião',
  sort_distance: 'ordenação por distância',
};

const canonicalParameterNames = [
  'q',
  'min',
  'max',
  'people',
  'cat',
  'restriction',
  'without',
  'occasion',
  'sort',
  'lat',
  'lng',
  'location',
  'neighborhood',
  'region',
  'city',
  'state',
  'radius',
  'locationSource',
  'locationCleared',
] as const;

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Mantém links antigos funcionando, mas converte-os imediatamente para o
 * contrato compartilhado pela Home, Busca e assistente.
 */
function normalizeUrlParameters(input: URLSearchParams): URLSearchParams {
  const output = new URLSearchParams();

  canonicalParameterNames.forEach((name) => {
    input.getAll(name).forEach((value) => output.append(name, value));
  });

  if (!output.has('q') && input.get('searchQuery')?.trim()) {
    output.set('q', input.get('searchQuery')!.trim());
  }
  if (!output.has('min') && input.has('minPrice')) output.set('min', input.get('minPrice') ?? '');
  if (!output.has('max') && input.has('maxPrice')) output.set('max', input.get('maxPrice') ?? '');
  if (!output.has('radius') && input.has('maxDistance')) {
    output.set('radius', input.get('maxDistance') ?? '');
  }

  if (!output.has('cat')) {
    const categories = (input.get('includedCategories') ?? '')
      .split(',')
      .map((category) => category.trim())
      .filter(Boolean);
    categories.forEach((category) => output.append('cat', category));
  }

  const requestedView = input.get('view')
    ?? (input.get('searchType') === 'restaurant' ? 'restaurants' : null);
  if (requestedView === 'restaurants') output.set('view', 'restaurants');

  return output;
}

function paramsForIntent(intent: MenuSearchIntent, view: SearchType): URLSearchParams {
  const params = menuIntentToSearchParams(intent);
  if (view === 'restaurant') params.set('view', 'restaurants');
  return params;
}

function mapDishResult(result: MenuDiscoveryResult): SearchItem {
  return {
    id: result.itemId,
    name: result.itemName,
    description: result.itemDescription,
    price: result.price.value,
    priceType: result.price.type,
    displayPrice: result.price.value,
    priceMin: result.price.min,
    priceMax: result.price.max,
    imageUrl: result.itemImageUrl,
    type: 'dish',
    category: result.restaurantCategory,
    city: result.restaurantCity,
    distance_km: result.distanceKm ?? undefined,
    restaurantName: result.restaurantName,
    itemCategoryName: result.itemCategoryName,
    itemCategoryId: result.itemCategoryId,
    neighborhood: result.restaurantNeighborhood,
  };
}

/**
 * A RPC canônica devolve itens publicados. A aba de restaurantes é apenas uma
 * projeção deduplicada desses mesmos registros — ela não dispara outra busca e
 * não inventa foto, nota, funcionamento ou disponibilidade do restaurante.
 */
function groupRestaurants(results: MenuDiscoveryResult[]): SearchItem[] {
  const restaurants = new Map<string, SearchItem>();

  results.forEach((result) => {
    if (restaurants.has(result.restaurantId)) return;
    restaurants.set(result.restaurantId, {
      id: result.restaurantId,
      name: result.restaurantName,
      description: null,
      imageUrl: null,
      type: 'restaurant',
      category: result.restaurantCategory,
      city: result.restaurantCity,
      distance_km: result.distanceKm ?? undefined,
      neighborhood: result.restaurantNeighborhood,
    });
  });

  return [...restaurants.values()];
}

function blankNamedLocation(neighborhood: string, current: MenuSearchLocation | null): MenuSearchLocation {
  return {
    latitude: null,
    longitude: null,
    label: neighborhood,
    neighborhood,
    regionId: null,
    city: current?.city ?? null,
    state: current?.state ?? null,
    radiusKm: null,
    source: 'manual',
  };
}

export default function SearchUnifiedPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    location,
    hasLocation,
    isLoading: isLocationLoading,
    source: locationSource,
    refetch: refetchLocation,
  } = useUserSearchLocation();
  const session = useMenuDiscoverySession({ surface: 'search' });

  const [searchQuery, setSearchQuery] = useState(session.rawText);
  const [activeSearchType, setActiveSearchType] = useState<SearchType>(
    searchParams.get('view') === 'restaurants' || searchParams.get('searchType') === 'restaurant'
      ? 'restaurant'
      : 'dish',
  );
  const [isSubmitted, setIsSubmitted] = useState(Boolean(session.intent));
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [requestedLimit, setRequestedLimit] = useState(PAGE_LIMIT);

  const hydratedUrlRef = useRef<string | null>(null);
  const initializedWithoutUrlRef = useRef(false);
  const pendingFilterPatchRef = useRef<MenuSearchIntentPatch>({});
  const pendingFilterTimerRef = useRef<number | null>(null);
  const sessionSnapshotRef = useRef({
    intent: session.intent,
    status: session.status,
    resultsLength: session.results.length,
  });
  sessionSnapshotRef.current = {
    intent: session.intent,
    status: session.status,
    resultsLength: session.results.length,
  };

  const menuLocation = useMemo<MenuSearchLocation | null>(() => {
    if (!hasLocation || location.latitude === null || location.longitude === null) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.address || null,
      neighborhood: null,
      regionId: null,
      city: null,
      state: null,
      radiusKm: 10,
      source: locationSource === 'gps' ? 'gps' : locationSource === 'saved' ? 'profile' : 'manual',
    };
  }, [hasLocation, location.address, location.latitude, location.longitude, locationSource]);

  const menuLocationKey = useMemo(() => JSON.stringify(menuLocation), [menuLocation]);
  const paramsKey = searchParams.toString();
  const hydrateFromSearchParams = session.hydrateFromSearchParams;
  const submitIntent = session.submitIntent;
  const refine = session.refine;

  const syncUrl = useCallback((intent: MenuSearchIntent, view: SearchType, replace = true) => {
    const nextParams = paramsForIntent(intent, view);
    hydratedUrlRef.current = nextParams.toString();
    setSearchParams(nextParams, { replace });
  }, [setSearchParams]);

  useEffect(() => {
    const sourceParams = new URLSearchParams(paramsKey);
    const normalizedParams = normalizeUrlParameters(sourceParams);
    const requestedView: SearchType = normalizedParams.get('view') === 'restaurants' ? 'restaurant' : 'dish';
    const hasDiscoveryInput = normalizedParams.has('q') || normalizedParams.has('cat');

    setActiveSearchType(requestedView);

    if (!hasDiscoveryInput) {
      if (!initializedWithoutUrlRef.current) {
        initializedWithoutUrlRef.current = true;
        const current = sessionSnapshotRef.current;
        if (current.intent) {
          setSearchQuery(current.intent.rawText);
          setIsSubmitted(true);
        }
      }
      return;
    }

    const normalizedKey = normalizedParams.toString();
    if (hydratedUrlRef.current === normalizedKey) return;

    // A Home antiga aponta para `searchQuery`. Quando a intenção já está na
    // sessão singleton, preservar o objeto completo evita perder localização,
    // resultados e refinamentos ao abrir a tela de busca.
    const legacyQuery = sourceParams.has('q') ? null : sourceParams.get('searchQuery')?.trim();
    const hasLegacyFilter = [
      'minPrice',
      'maxPrice',
      'maxDistance',
      'excludedCategoryIds',
      'includedCategories',
      'neighborhood',
    ].some((key) => sourceParams.has(key));
    const currentBeforeHydration = sessionSnapshotRef.current;
    if (
      legacyQuery
      && !hasLegacyFilter
      && currentBeforeHydration.intent
      && normalizeText(currentBeforeHydration.intent.rawText) === normalizeText(legacyQuery)
      && (currentBeforeHydration.resultsLength > 0 || currentBeforeHydration.status !== 'idle')
    ) {
      hydratedUrlRef.current = normalizedKey;
      setSearchQuery(currentBeforeHydration.intent.rawText);
      setIsSubmitted(true);
      syncUrl(currentBeforeHydration.intent, requestedView);
      return;
    }

    const parsed = menuIntentFromSearchParams(normalizedParams);
    if (!parsed) return;
    if (!parsed.location && isLocationLoading) return;

    const effectiveIntent: MenuSearchIntent = parsed.location
      ? parsed
      : { ...parsed, location: menuLocation };
    const current = sessionSnapshotRef.current;
    const sameIntent = current.intent
      && menuIntentCacheKey(current.intent) === menuIntentCacheKey(effectiveIntent)
      && current.intent.rawText === effectiveIntent.rawText;

    hydratedUrlRef.current = normalizedKey;
    setSearchQuery(effectiveIntent.rawText);
    setIsSubmitted(true);
    setRequestedLimit(PAGE_LIMIT);

    if (sameIntent && (current.resultsLength > 0 || current.status !== 'idle')) {
      syncUrl(current.intent!, requestedView);
      return;
    }

    const hydratedIntent = hydrateFromSearchParams(normalizedParams);
    if (!hydratedIntent) return;
    const intentWithLocation: MenuSearchIntent = hydratedIntent.location
      ? hydratedIntent
      : { ...hydratedIntent, location: menuLocation };

    void submitIntent(intentWithLocation, { limit: PAGE_LIMIT }).then((next) => {
      if (next.intent) syncUrl(next.intent, requestedView);
    });
  }, [
    hydrateFromSearchParams,
    isLocationLoading,
    menuLocation,
    menuLocationKey,
    paramsKey,
    submitIntent,
    syncUrl,
  ]);

  useEffect(() => () => {
    if (pendingFilterTimerRef.current !== null) {
      window.clearTimeout(pendingFilterTimerRef.current);
    }
  }, []);

  const submitSearch = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    setSearchQuery(clean);
    setIsSubmitted(true);
    setRequestedLimit(PAGE_LIMIT);

    const parsed = parseMenuSearchIntent(clean);
    const intent: MenuSearchIntent = {
      ...parsed,
      location: parsed.location ?? menuLocation,
    };
    const next = await submitIntent(intent, { limit: PAGE_LIMIT });
    if (next.intent) syncUrl(next.intent, activeSearchType, false);
  }, [activeSearchType, menuLocation, submitIntent, syncUrl]);

  const applyRefinement = useCallback(async (patch: MenuSearchIntentPatch) => {
    if (!sessionSnapshotRef.current.intent) return;
    setIsSubmitted(true);
    setRequestedLimit(PAGE_LIMIT);
    const next = await refine(patch);
    if (next.intent) syncUrl(next.intent, activeSearchType);
  }, [activeSearchType, refine, syncUrl]);

  /** O drawer emite categoria, bairro e preço separadamente; agrupamos tudo
   * no mesmo tick para executar uma única consulta canônica. */
  const queueFilterRefinement = useCallback((patch: MenuSearchIntentPatch) => {
    pendingFilterPatchRef.current = { ...pendingFilterPatchRef.current, ...patch };
    if (pendingFilterTimerRef.current !== null) {
      window.clearTimeout(pendingFilterTimerRef.current);
    }
    pendingFilterTimerRef.current = window.setTimeout(() => {
      const combinedPatch = pendingFilterPatchRef.current;
      pendingFilterPatchRef.current = {};
      pendingFilterTimerRef.current = null;
      void applyRefinement(combinedPatch);
    }, 0);
  }, [applyRefinement]);

  const dishResults = useMemo(() => session.results.map(mapDishResult), [session.results]);
  const restaurantResults = useMemo(() => groupRestaurants(session.results), [session.results]);
  const displayedResults = activeSearchType === 'dish' ? dishResults : restaurantResults;

  const dishCategoryOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();
    session.results.forEach((result) => {
      options.set(result.itemCategoryId, { id: result.itemCategoryId, name: result.itemCategoryName });
    });
    return [...options.values()];
  }, [session.results]);

  const restaurantCategoryOptions = useMemo(() => {
    const names = new Set(
      session.results
        .map((result) => result.restaurantCategory?.trim())
        .filter((name): name is string => Boolean(name)),
    );
    return [...names].map((name) => ({ id: name, name }));
  }, [session.results]);

  const activeCategoryOptions = activeSearchType === 'dish'
    ? dishCategoryOptions
    : restaurantCategoryOptions;

  const selectedCategoryIds = useMemo(() => {
    const selected = new Set((session.intent?.categories ?? []).map(normalizeText));
    return activeCategoryOptions
      .filter((category) => selected.has(normalizeText(category.name)))
      .map((category) => category.id);
  }, [activeCategoryOptions, session.intent?.categories]);

  const minPriceFilter = session.intent?.priceMin ?? null;
  const maxPriceFilter = session.intent?.priceMax ?? null;
  const maxDistanceFilter = session.intent?.location?.radiusKm ?? null;
  const selectedNeighborhoodFilter = session.intent?.location?.neighborhood ?? null;
  const customDistance = maxDistanceFilter !== null && maxDistanceFilter !== (menuLocation?.radiusKm ?? null);
  const hasActiveFilters = Boolean(
    minPriceFilter !== null
      || maxPriceFilter !== null
      || selectedNeighborhoodFilter
      || selectedCategoryIds.length > 0
      || customDistance,
  );
  const resultsLoading = ACTIVE_REQUEST_STATUSES.has(session.status);

  const handleApplyCategories = (ids: string[]) => {
    const selectedNames = ids
      .map((id) => activeCategoryOptions.find((category) => category.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    queueFilterRefinement({ categories: selectedNames });
  };

  const handleApplyNeighborhood = (neighborhood: string | null) => {
    const currentLocation = sessionSnapshotRef.current.intent?.location ?? null;
    queueFilterRefinement({
      location: neighborhood
        ? blankNamedLocation(neighborhood, currentLocation)
        : menuLocation,
    });
  };

  const handleApplyPrice = (min: number | null, max: number | null) => {
    queueFilterRefinement({ priceMin: min, priceMax: max });
  };

  const handleApplyPriceFilter = (min: number, max: number) => {
    setIsPriceModalOpen(false);
    showInfo(`Buscando itens publicados entre R$ ${min.toFixed(2)} e R$ ${max.toFixed(2)}.`);
    void applyRefinement({ priceMin: min, priceMax: max });
  };

  const handleApplyDistanceFilter = (distance: number) => {
    const currentLocation = sessionSnapshotRef.current.intent?.location ?? menuLocation;
    if (!currentLocation || currentLocation.latitude === null || currentLocation.longitude === null) {
      setIsDistanceModalOpen(false);
      showError('Defina uma localização com coordenadas para aplicar o filtro de distância.');
      setIsLocationModalOpen(true);
      return;
    }
    setIsDistanceModalOpen(false);
    showInfo(`Buscando no catálogo publicado em um raio de até ${distance} km.`);
    void applyRefinement({ location: { ...currentLocation, radiusKm: distance } });
  };

  const handleClearFilters = () => {
    void applyRefinement({
      priceMin: null,
      priceMax: null,
      categories: [],
      restrictions: [],
      excludedIngredients: [],
      location: menuLocation,
      sort: 'relevance',
    });
  };

  const handleToggleChange = (type: 'dishes' | 'restaurants') => {
    const nextType: SearchType = type === 'dishes' ? 'dish' : 'restaurant';
    setActiveSearchType(nextType);
    if (session.intent) syncUrl(session.intent, nextType);
  };

  const handleLoadMore = async () => {
    if (!session.intent) return;
    setRequestedLimit(EXPANDED_LIMIT);
    const next = await submitIntent(session.intent, { limit: EXPANDED_LIMIT, offset: 0 });
    if (next.intent) syncUrl(next.intent, activeSearchType);
  };

  const handleRetry = () => {
    if (session.intent) {
      void submitIntent(session.intent, { limit: requestedLimit }).then((next) => {
        if (next.intent) syncUrl(next.intent, activeSearchType);
      });
      return;
    }
    void submitSearch(searchQuery);
  };

  const handleItemClick = (itemId: string, type: SearchType) => {
    navigate(type === 'restaurant'
      ? createPageUrl('restaurantProfile', { restaurantId: itemId })
      : createPageUrl('menuItemDetails', { itemId }));
  };

  const stateNeedsPanel = [
    'checking_coverage',
    'parsing',
    'searching',
    'rewriting',
    'no_result',
    'no_coverage',
    'offline',
    'error',
  ].includes(session.status) && !(session.status === 'offline' && session.results.length > 0);

  const pageContent = (
    <div className="space-y-4 px-5 pb-5 pt-4">
      <div className="flex flex-wrap gap-2" aria-label="Filtros rápidos">
        <button
          type="button"
          onClick={() => setIsPriceModalOpen(true)}
          className={cn(
            'flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
            minPriceFilter !== null || maxPriceFilter !== null
              ? 'border-highlight bg-highlight text-white shadow-sm'
              : 'border-slate-100 bg-white text-text-secondary shadow-soft hover:border-highlight/30',
          )}
        >
          <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
          {minPriceFilter !== null || maxPriceFilter !== null
            ? `R$ ${minPriceFilter ?? 0}–R$ ${maxPriceFilter ?? '∞'}`
            : 'Preço'}
        </button>

        <button
          type="button"
          onClick={() => {
            const locationWithCoordinates = session.intent?.location ?? menuLocation;
            if (!locationWithCoordinates
              || locationWithCoordinates.latitude === null
              || locationWithCoordinates.longitude === null) {
              showError('Defina sua localização para filtrar por distância.');
              setIsLocationModalOpen(true);
              return;
            }
            setIsDistanceModalOpen(true);
          }}
          className={cn(
            'flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
            maxDistanceFilter !== null
              ? 'border-highlight bg-highlight text-white shadow-sm'
              : 'border-slate-100 bg-white text-text-secondary shadow-soft hover:border-highlight/30',
          )}
        >
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          {maxDistanceFilter !== null ? `Até ${maxDistanceFilter} km` : 'Distância'}
        </button>

        {selectedNeighborhoodFilter && (
          <span className="flex min-h-11 items-center gap-1.5 rounded-full border border-highlight bg-highlight px-3.5 text-[13px] font-semibold text-white shadow-sm">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {selectedNeighborhoodFilter}
          </span>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-highlight/15 bg-highlight/10 px-3.5 text-[13px] font-semibold text-highlight transition-colors hover:bg-highlight/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {session.intent && (
        <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft">
          <IntentSummary intent={session.intent} onPatch={(patch) => void applyRefinement(patch)} />
        </div>
      )}

      <SearchToggle
        activeType={activeSearchType === 'dish' ? 'dishes' : 'restaurants'}
        onToggle={handleToggleChange}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight text-[#3C2F2F]">
            {activeSearchType === 'dish' ? 'Pratos encontrados' : 'Restaurantes encontrados'}
          </h2>
          {session.coverage?.regionLabel && (
            <p className="mt-0.5 text-xs text-text-secondary">Cobertura: {session.coverage.regionLabel}</p>
          )}
        </div>
        <AdvancedFilterDrawer
          selectedCategoryIds={selectedCategoryIds}
          onApplyCategories={handleApplyCategories}
          allCategories={activeCategoryOptions}
          selectedNeighborhood={selectedNeighborhoodFilter}
          onApplyNeighborhood={handleApplyNeighborhood}
          minPrice={minPriceFilter}
          maxPrice={maxPriceFilter}
          onApplyPrice={handleApplyPrice}
          filterMode="include"
        />
      </div>

      {session.status === 'partial' && (
        <div role="status" className="rounded-[20px] border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
          <strong>Resultado parcial.</strong>{' '}
          {session.unappliedCriteria.length > 0
            ? `Ainda não foi possível comprovar: ${session.unappliedCriteria.map((criterion) => criterionLabels[criterion]).join(', ')}.`
            : 'A cobertura publicada nesta região ainda é limitada.'}
        </div>
      )}

      {session.status === 'stale' && (
        <div role="status" className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-700">
          <strong>Dados salvos.</strong> Não foi possível atualizar agora; confira a origem e a data antes de decidir.
        </div>
      )}

      {session.status === 'offline' && session.results.length > 0 && (
        <div role="status" className="rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-700">
          <strong>Sem conexão.</strong> Estes são dados salvos de uma consulta anterior e podem estar desatualizados.
        </div>
      )}

      {stateNeedsPanel && (
        <DiscoveryStatePanel
          status={session.status}
          error={session.error}
          coverage={session.coverage}
          onRetry={handleRetry}
          onSetLocation={() => setIsLocationModalOpen(true)}
        />
      )}

      {session.status === 'cancelled' && (
        <div role="status" className="rounded-[24px] border border-slate-100 bg-white p-6 text-center shadow-soft">
          <AlertCircle className="mx-auto h-6 w-6 text-text-secondary" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-[#3C2F2F]">A consulta foi interrompida</h3>
          <Button type="button" variant="outline" onClick={handleRetry} className="mt-4 min-h-11 rounded-full">
            Consultar novamente
          </Button>
        </div>
      )}

      {!stateNeedsPanel && session.status !== 'cancelled' && (
        <div className="space-y-3" aria-live="polite">
          {resultsLoading && displayedResults.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))
          ) : displayedResults.length > 0 ? (
            <>
              <p className="sr-only">{displayedResults.length} resultados do catálogo publicado.</p>
              {displayedResults.map((item) => (
                <SearchItemCard key={`${item.type}:${item.id}`} item={item} onClick={handleItemClick} />
              ))}
              {session.hasMore && requestedLimit < EXPANDED_LIMIT && (
                <Button
                  type="button"
                  onClick={() => void handleLoadMore()}
                  variant="outline"
                  className="mt-4 min-h-11 w-full rounded-2xl border-slate-200 text-xs font-semibold text-slate-700 shadow-none hover:bg-highlight/10"
                  disabled={resultsLoading}
                >
                  {resultsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
                  Ver mais resultados publicados
                </Button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white text-highlight shadow-soft">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mb-2 text-[20px] font-semibold text-[#3C2F2F]">
                Nenhum resultado publicado nesta visão
              </h2>
              <p className="mb-6 text-[14px] leading-relaxed text-text-secondary">
                Tente editar a pergunta ou remover um critério. Não exibiremos opções de outra intenção sem avisar.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="min-h-11 rounded-[18px] bg-highlight px-7 text-[15px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={refetchLocation}
      />
    </div>
  );

  const renderSuggestions = () => {
    const cleanQuery = searchQuery.trim();
    return (
      <div className="space-y-6 px-5 pt-6">
        {cleanQuery && (
          <button
            type="button"
            onClick={() => void submitSearch(cleanQuery)}
            className="flex min-h-14 w-full items-center justify-between rounded-[20px] border border-highlight/20 bg-white p-4 text-left shadow-soft transition-colors hover:bg-highlight/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-highlight/10 text-highlight">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-text-secondary">Consultar cardápios</span>
                <span className="block truncate text-[14px] font-semibold text-[#3C2F2F]">“{cleanQuery}”</span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
          </button>
        )}

        <section aria-labelledby="suggested-searches-title">
          <div className="flex items-center gap-2 text-[#3C2F2F]">
            <SlidersHorizontal className="h-4 w-4 text-highlight" aria-hidden="true" />
            <h2 id="suggested-searches-title" className="text-[13px] font-semibold uppercase tracking-wide">
              Perguntas para experimentar
            </h2>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
            A consulta cruza apenas informações presentes nos cardápios publicados.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SUGGESTED_SEARCHES.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void submitSearch(suggestion)}
                className="flex min-h-14 items-center justify-between rounded-[20px] border border-slate-100 bg-white p-4 text-left shadow-soft transition-colors hover:border-highlight/25 hover:bg-highlight/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
              >
                <span className="text-[14px] font-semibold text-[#3C2F2F]">{suggestion}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="relative flex w-full flex-grow flex-col bg-[#FAFAFA] font-['Poppins']">
      <Header
        title="Buscar"
        subtitle="Consulte os cardápios publicados"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1), ariaLabel: 'Voltar' }}
      >
        <SoftSearchInput
          aria-label="Pergunte sobre pratos, preços ou restaurantes"
          placeholder="Ex.: jantar para 2 até R$ 100"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsSubmitted(false);
          }}
          onSubmitAction={(event) => {
            event.preventDefault();
            void submitSearch(searchQuery);
          }}
        />
      </Header>
      <main className="w-full flex-grow pb-8">
        {isSubmitted ? pageContent : renderSuggestions()}
      </main>
    </div>
  );
}
