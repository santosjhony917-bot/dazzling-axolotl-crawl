import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  ChevronDown,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FeatureTour } from '@/components/onboarding/FeatureTour';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import {
  DiscoveryStatePanel,
  GroundedResultCard,
  IntentSummary,
} from '@/features/menu-assistant/components';
import { AiHomeHero } from '@/features/home/AiHomeHero';
import { useHomeCatalogFeed, useMenuDiscoverySession } from '@/features/menu-assistant';
import type { MenuSearchLocation, UnappliedCriterion } from '@/features/menu-assistant';
import {
  trackMenuHomeViewed,
  trackMenuLocationResolved,
  trackMenuPromptStarted,
} from '@/features/menu-assistant/telemetry';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { ALLOW_LOCAL_FIXTURES } from '@/lib/runtimeMode';
import { createPageUrl } from '@/utils/url';

const LazyIllustrativeDiscovery = (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true')
  ? React.lazy(async () => {
      const module = await import('@/features/home/IllustrativeDiscovery');
      return { default: module.IllustrativeDiscovery };
    })
  : null;

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

function locationDetails(address: string) {
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  const stateIndex = parts.findIndex((part) => /^[A-Z]{2}$/i.test(part));
  if (stateIndex > 0) {
    return {
      neighborhood: stateIndex > 1 ? parts[stateIndex - 2] : null,
      city: parts[stateIndex - 1] || null,
      state: parts[stateIndex].toUpperCase(),
    };
  }

  const cityState = address.match(/,\s*([^,]+?)\s*-\s*([A-Z]{2})(?:\s|,|$)/i);
  const neighborhood = address.match(/-\s*([^,]+),/);
  return {
    neighborhood: neighborhood?.[1]?.trim() || null,
    city: cityState?.[1]?.trim() || null,
    state: cityState?.[2]?.toUpperCase() || null,
  };
}

function shortAddress(address: string) {
  if (!address) return 'Definir localização';
  const first = address.split(',')[0]?.trim();
  return first?.replace(/^rua\s+/i, 'R. ').replace(/^avenida\s+/i, 'Av. ') || address;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const FeedSkeleton = () => (
  <div className="grid grid-cols-2 gap-3" aria-hidden="true">
    {[0, 1].map((item) => (
      <div key={item} className="overflow-hidden rounded-[22px] border border-[var(--ff-border-soft)] bg-white">
        <div className="h-24 animate-pulse bg-slate-100 motion-reduce:animate-none" />
        <div className="space-y-2 p-3">
          <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        </div>
      </div>
    ))}
  </div>
);

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    location,
    status: locationStatus,
    source: locationSource,
    hasLocation,
    refetch: refetchLocation,
  } = useUserSearchLocation();
  const session = useMenuDiscoverySession({ surface: 'home' });
  const [query, setQuery] = useState(session.rawText);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const homeViewTrackedRef = useRef(false);
  const promptStartTrackedRef = useRef(false);
  const locationTrackedRef = useRef(false);

  const menuLocation = useMemo<MenuSearchLocation | null>(() => {
    if (!hasLocation || location.latitude === null || location.longitude === null) return null;
    const details = locationDetails(location.address);
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.address,
      neighborhood: details.neighborhood,
      regionId: null,
      city: details.city,
      state: details.state,
      radiusKm: 10,
      source: locationSource === 'gps' ? 'gps' : locationSource === 'saved' ? 'profile' : 'manual',
    };
  }, [hasLocation, location.address, location.latitude, location.longitude, locationSource]);
  const homeFeed = useHomeCatalogFeed(menuLocation);

  useEffect(() => {
    const completed = localStorage.getItem('filterfood_feature_tour_completed') || localStorage.getItem('tutorial_visto');
    if (!completed) {
      const timer = window.setTimeout(() => setShowTour(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    let pendingPrompt = '';
    try {
      pendingPrompt = sessionStorage.getItem('filterfood_pending_prompt')?.trim().slice(0, 500) ?? '';
      if (pendingPrompt) sessionStorage.removeItem('filterfood_pending_prompt');
    } catch {
      return;
    }
    if (!pendingPrompt) return;
    setQuery(pendingPrompt);
    trackMenuPromptStarted({ surface: 'home', entryPoint: 'landing_handoff' });
    promptStartTrackedRef.current = true;
  }, []);

  useEffect(() => {
    if (locationStatus === 'loading' || homeViewTrackedRef.current) return;
    trackMenuHomeViewed({ hasLocation, demoAvailable: ALLOW_LOCAL_FIXTURES });
    homeViewTrackedRef.current = true;
  }, [hasLocation, locationStatus]);

  useEffect(() => {
    if (!hasLocation || locationTrackedRef.current) return;
    trackMenuLocationResolved({
      surface: 'home',
      source: locationSource === 'gps' ? 'gps' : locationSource === 'saved' ? 'profile' : 'manual',
    });
    locationTrackedRef.current = true;
  }, [hasLocation, locationSource]);

  useEffect(() => {
    if (searchParams.get('assistant') !== '1') return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('[data-menu-composer="true"]')?.focus();
    });
  }, [searchParams]);

  useEffect(() => {
    if (!['success', 'partial', 'stale'].includes(session.status) || session.results.length === 0) return;
    window.requestAnimationFrame(() => resultTitleRef.current?.focus());
  }, [session.results.length, session.status]);

  const submit = async (text = query) => {
    const clean = text.trim();
    if (!clean) return;
    if (!menuLocation) {
      setIsLocationModalOpen(true);
      return;
    }
    setQuery(clean);
    await session.submit(clean, { intentPatch: { location: menuLocation }, limit: 12 });
  };

  const isResultState = ['success', 'partial', 'stale', 'offline'].includes(session.status)
    && session.results.length > 0;
  const isDiscoveryActive = session.status !== 'idle';
  const isAssistantBusy = ['checking_coverage', 'parsing', 'searching', 'rewriting'].includes(session.status);
  const assistantStatusLabel = isAssistantBusy
    ? 'CONSULTANDO'
    : isResultState
      ? 'COMPROVADO'
      : !hasLocation && ALLOW_LOCAL_FIXTURES
        ? 'MODO DEMO'
        : !hasLocation
          ? 'SEM REGIÃO'
          : homeFeed.resultState === 'ready'
            ? 'CONECTADA'
            : 'VALIDANDO';
  const showIllustrativeDiscovery = ALLOW_LOCAL_FIXTURES
    && !isDiscoveryActive
    && (!hasLocation || ['no_coverage', 'empty', 'unverified', 'error'].includes(homeFeed.resultState));

  const useIllustrativePrompt = (prompt: string) => {
    trackMenuPromptStarted({ surface: 'home', entryPoint: 'illustrative_card' });
    promptStartTrackedRef.current = true;
    setQuery(prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('[data-menu-composer="true"]')?.focus();
    });
  };

  const changeQuery = (value: string) => {
    if (!promptStartTrackedRef.current && value.trim().length > 0) {
      trackMenuPromptStarted({ surface: 'home', entryPoint: 'composer' });
      promptStartTrackedRef.current = true;
    }
    setQuery(value);
  };

  return (
    <div className="min-h-full flex-1 bg-[#FAFAFA] font-['Poppins'] text-[var(--ff-text-primary)]">
      <header className="bg-white px-5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-['Lobster'] text-[30px] leading-none text-[var(--ff-primary)]">FilterFood</p>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="mt-0.5 flex min-h-11 max-w-[250px] items-center gap-1.5 rounded-full text-left text-[12px] font-semibold text-slate-600 transition-colors hover:text-[var(--ff-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--ff-primary)]" aria-hidden="true" />
              <span className="truncate">
                {locationStatus === 'loading' ? 'Carregando localização…' : shortAddress(location.address)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--ff-border-warm)] bg-[var(--ff-orange-soft)] shadow-[var(--ff-shadow-card)] transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
            aria-label="Abrir perfil"
          >
            <img
              src="/images/filterfood_avatar_home_tray.webp"
              alt=""
              className="h-full w-full object-cover object-[48%_18%]"
            />
          </button>
        </div>
      </header>

      <main className="px-4 pb-8 pt-3">
        <AiHomeHero
          value={query}
          status={session.status}
          statusLabel={assistantStatusLabel}
          onChange={changeQuery}
          onSubmit={() => void submit()}
          onSuggestion={(suggestion) => void submit(suggestion)}
          autoFocus={searchParams.get('assistant') === '1'}
        />

        {session.intent && (
          <div className="mt-4 rounded-[22px] border border-[var(--ff-border-soft)] bg-white p-3 shadow-[var(--ff-shadow-card)]">
            <IntentSummary intent={session.intent} onPatch={(patch) => void session.refine(patch)} />
          </div>
        )}

        {session.status === 'partial' && (
          <div role="status" className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
            <strong>Resultado parcial.</strong>{' '}
            {session.unappliedCriteria.length > 0
              ? `Ainda não foi possível provar: ${session.unappliedCriteria.map((criterion) => criterionLabels[criterion]).join(', ')}.`
              : 'A cobertura disponível ainda é limitada.'}
          </div>
        )}

        {session.status === 'stale' && (
          <div role="status" className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-700">
            <strong>Dados salvos.</strong> Não foi possível atualizar agora. Confira a fonte e a data antes de decidir.
          </div>
        )}

        {isDiscoveryActive && (
          <div className="mt-4">
            <DiscoveryStatePanel
              status={session.status}
              error={session.error}
              coverage={session.coverage}
              onRetry={() => void submit(session.rawText || query)}
              onSetLocation={() => setIsLocationModalOpen(true)}
            />
          </div>
        )}

        {isResultState && (
          <section id="tour-results-panel" className="mt-6" aria-labelledby="menu-results-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--ff-primary)]">
                  {session.usedAI ? 'Consulta ampliada pela IA' : 'Catálogo publicado'}
                </p>
                <h2
                  id="menu-results-title"
                  ref={resultTitleRef}
                  tabIndex={-1}
                  className="mt-1 text-lg font-extrabold tracking-tight outline-none"
                >
                  Opções para sua pergunta
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--ff-orange-soft)] px-3 py-1.5 text-xs font-bold text-[var(--ff-primary)]">
                {session.results.length}
              </span>
            </div>

            <div className="mt-3 grid gap-3">
              {session.results.map((result) => <GroundedResultCard key={result.id} result={result} />)}
            </div>

            <Link
              to={`/search?searchQuery=${encodeURIComponent(session.intent?.rawText || query)}`}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--ff-border-warm)] bg-white px-5 text-sm font-bold text-[var(--ff-primary)] hover:bg-[var(--ff-orange-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
            >
              Abrir filtros detalhados <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        )}

        {!isDiscoveryActive && (
          <div className="mt-5 space-y-6">
            {showIllustrativeDiscovery && LazyIllustrativeDiscovery && (
              <React.Suspense fallback={<FeedSkeleton />}>
                <LazyIllustrativeDiscovery
                  onUsePrompt={useIllustrativePrompt}
                  onSetLocation={() => setIsLocationModalOpen(true)}
                  onRetryRealData={() => void homeFeed.refetch()}
                  locationLabel={hasLocation ? shortAddress(location.address) : null}
                  realDataState={!hasLocation
                    ? 'location_required'
                    : homeFeed.resultState === 'error'
                      ? 'technical_error'
                      : homeFeed.resultState === 'unverified'
                        ? 'catalog_unverified'
                        : 'coverage_limited'}
                />
              </React.Suspense>
            )}

            {!ALLOW_LOCAL_FIXTURES && !hasLocation && (
              <section className="rounded-[24px] border border-[#F3C9BC] bg-[#FFF7F3] p-4" aria-labelledby="activate-region-title">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--ff-primary)] shadow-sm">
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 id="activate-region-title" className="mt-3 text-[17px] font-extrabold tracking-tight">Defina sua região para consultar o catálogo.</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">A IA usa a localização para mostrar somente cardápios publicados que tenham cobertura comprovável.</p>
                <button type="button" onClick={() => setIsLocationModalOpen(true)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--ff-primary)] px-4 text-xs font-bold text-white shadow-[var(--ff-shadow-button)]">
                  <MapPin className="h-4 w-4" aria-hidden="true" /> Definir localização
                </button>
              </section>
            )}

            {hasLocation && homeFeed.resultState === 'loading' && (
              <section aria-label="Carregando catálogo da região">
                <div className="mb-3 h-5 w-48 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
                <FeedSkeleton />
              </section>
            )}

            {hasLocation && homeFeed.resultState === 'ready' && (
              <>
                <section aria-labelledby="popular-menu-title">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--ff-primary)]">Catálogo publicado</p>
                      <h2 id="popular-menu-title" className="mt-1 text-[18px] font-extrabold tracking-tight">Destaques perto de você</h2>
                    </div>
                    <Link to="/search" className="shrink-0 text-xs font-bold text-[var(--ff-primary)]">Explorar</Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {homeFeed.data?.items.slice(0, 4).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: item.restaurantId }))}
                        className="group min-w-0 overflow-hidden rounded-[22px] border border-slate-200/80 bg-white text-left shadow-[0_10px_26px_rgba(15,23,42,0.055)] transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
                      >
                        <span className="relative block">
                          {item.itemImageUrl ? (
                            <img src={item.itemImageUrl} alt="" className="h-24 w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="flex h-24 w-full items-center justify-center bg-[var(--ff-surface-warm)] text-[var(--ff-primary)]">
                              <BookOpenText className="h-6 w-6" aria-hidden="true" />
                            </span>
                          )}
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/50 bg-[#211A1B]/70 text-[#64EFE5] backdrop-blur-md">
                            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </span>
                        <span className="block p-3">
                          <span className="block truncate text-[13px] font-bold">{item.itemName}</span>
                          <span className="mt-1 block text-[13px] font-extrabold text-[var(--ff-primary)]">{formatCurrency(item.price.value)}</span>
                          <span className="mt-1 block truncate text-[11px] text-[var(--ff-text-secondary)]">{item.restaurantName}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="nearby-title">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#0E8D87]">Raio de até 10 km</p>
                      <h2 id="nearby-title" className="mt-1 text-[18px] font-extrabold tracking-tight">Cardápios na sua região</h2>
                    </div>
                    <Link to="/search" className="shrink-0 text-xs font-bold text-[var(--ff-primary)]">Ver todos</Link>
                  </div>
                  <div className="space-y-3">
                    {homeFeed.data?.restaurants.slice(0, 3).map((restaurant) => (
                      <button
                        key={restaurant.id}
                        type="button"
                        onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                        className="flex min-h-[86px] w-full items-center gap-3 rounded-[22px] border border-slate-200/80 bg-white p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.045)] transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
                      >
                        {restaurant.representativeItemImageUrl ? (
                          <img src={restaurant.representativeItemImageUrl} alt="" className="h-16 w-16 shrink-0 rounded-[16px] object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-[var(--ff-surface-warm)] text-[var(--ff-primary)]">
                            <Store className="h-6 w-6" aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold">{restaurant.name}</span>
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#0E9A93]" aria-label="Origem verificada no catálogo" />
                          </span>
                          <span className="mt-1 block truncate text-xs text-[var(--ff-text-secondary)]">{[restaurant.category, restaurant.neighborhood].filter(Boolean).join(' · ') || 'Cardápio publicado'}</span>
                          <span className="mt-1 block text-[11px] font-semibold text-[var(--ff-primary)]">{restaurant.distanceKm !== null ? `${restaurant.distanceKm.toFixed(1)} km` : `${restaurant.publishedItemCount} itens publicados`}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {!ALLOW_LOCAL_FIXTURES && hasLocation && ['no_coverage', 'empty', 'unverified', 'error'].includes(homeFeed.resultState) && (
              <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[#211A1B] p-5 text-white" aria-labelledby="catalog-state-title">
                <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-cyan-300/20" />
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#64EFE5]">Estado real do catálogo</p>
                <h2 id="catalog-state-title" className="mt-2 text-lg font-extrabold">{homeFeed.resultState === 'error' ? 'Não foi possível consultar agora.' : homeFeed.resultState === 'unverified' ? 'A distância ainda não pôde ser comprovada.' : 'Ainda não há cardápios suficientes nesta região.'}</h2>
                <p className="mt-2 max-w-[300px] text-xs leading-5 text-white/65">{homeFeed.resultState === 'error' ? 'Sua localização foi mantida. Tente novamente sem perder o contexto.' : homeFeed.resultState === 'unverified' ? 'Os itens só serão apresentados como locais quando a consulta pública confirmar o raio da busca.' : 'Estamos adicionando novos cardápios. Você pode trocar a região ou tentar outra busca.'}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {homeFeed.resultState === 'error' && (
                    <button type="button" onClick={() => void homeFeed.refetch()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-[#211A1B]">
                      <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar novamente
                    </button>
                  )}
                  <button type="button" onClick={() => setIsLocationModalOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-bold text-white">
                    <MapPin className="h-4 w-4 text-[#64EFE5]" aria-hidden="true" /> Mudar região
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={refetchLocation}
      />

      {showTour && <FeatureTour onClose={() => setShowTour(false)} />}
    </div>
  );
};

export default Home;
