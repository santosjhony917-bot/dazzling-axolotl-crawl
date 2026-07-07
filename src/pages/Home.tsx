import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock,
  GraduationCap,
  Heart,
  Landmark,
  Map,
  MapPin,
  Mic2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Users,
  Utensils,
  Waves,
} from 'lucide-react';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { createPageUrl } from '@/utils/url';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { useFavorites } from '@/hooks/useFavorites';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { cn } from '@/lib/utils';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import {
  ChefPlatterIllustration,
  ComboIllustration,
  BurgerIllustration,
  CupcakeIllustration,
  PizzaIllustration,
  SaladIllustration,
} from '@/components/icons/CategoryDrawings';
import { FeatureTour } from '@/components/onboarding/FeatureTour';

const MACRO_REGIONS = [
  {
    id: 'all',
    label: 'Toda cidade',
    iconName: 'Map',
    neighborhoods: [],
  },
  {
    id: 'orla',
    label: 'Orla',
    iconName: 'Waves',
    neighborhoods: ['tambaú', 'tambau', 'cabo branco', 'manaíra', 'manaira', 'bessa', 'jardim oceania', 'altiplano', 'aeroclube', 'ponta de campina', 'intermares'],
  },
  {
    id: 'zona_sul',
    label: 'Zona Sul',
    iconName: 'GraduationCap',
    neighborhoods: ['bancários', 'bancarios', 'mangabeira', 'geisel', 'ernesto geisel', 'valentina', 'valentina de figueiredo', 'castelo branco', 'portal do sol', 'josé américo', 'jose americo', 'cidade universitária', 'cidade universitaria'],
  },
  {
    id: 'centro_norte',
    label: 'Centro / Norte',
    iconName: 'Landmark',
    neighborhoods: ['centro', 'torre', 'tambiá', 'tambia', 'bairro dos estados', 'estados', 'jaguaribe', 'mandacaru', 'roger', 'padre zé', 'padre ze', 'miramar', 'tambauzinho', 'expedicionários', 'expedicionarios'],
  },
];

const QUICK_SEARCHES = [
  { label: 'Burger R$30', icon: 'burger', query: 'hambúrguer até 30 reais' },
  { label: 'Sushi', icon: 'sushi', query: 'sushi' },
  { label: 'Pizza', icon: 'pizza', query: 'pizza com borda' },
  { label: 'Açaí', icon: 'acai', query: 'açaí' },
];

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'Tudo', icon: ChefPlatterIllustration },
  { id: 'combos', label: 'Combos', icon: ComboIllustration },
  { id: 'lanches', label: 'Lanches', icon: BurgerIllustration },
  { id: 'sobremesas', label: 'Sobremesas', icon: CupcakeIllustration },
  { id: 'pizza', label: 'Pizza', icon: PizzaIllustration },
  { id: 'saudavel', label: 'Saudável', icon: SaladIllustration },
];

const CITY_MENU_CARDS = [
  {
    title: 'Sushi House',
    meta: 'Japonesa • 1,2 km',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=360&h=480&fit=crop',
  },
  {
    title: 'Forneria 500',
    meta: 'Pizza • 950 m',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=360&h=480&fit=crop',
  },
  {
    title: 'Noodle Bar',
    meta: 'Asiática • 1,4 km',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=360&h=480&fit=crop',
  },
];

const RECOMMENDED_DISHES = [
  {
    title: 'Smash clássico',
    price: 'R$ 28,90',
    restaurant: 'Burger House',
    meta: 'Cabo Branco • 850 m',
    query: 'smash burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=520&h=380&fit=crop',
  },
  {
    title: 'Pizza margherita',
    price: 'R$ 46,00',
    restaurant: 'Forneria 500',
    meta: 'Cabo Branco • 950 m',
    query: 'pizza margherita',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=520&h=380&fit=crop',
  },
  {
    title: 'Poke salmão',
    price: 'R$ 36,90',
    restaurant: 'Noodle Bar',
    meta: 'Altiplano • 1,3 km',
    query: 'poke salmão',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=520&h=380&fit=crop',
  },
];

const normalize = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getRegionIcon = (iconName: string) => {
  switch (iconName) {
    case 'Map':
      return <Map className="h-3.5 w-3.5" />;
    case 'Waves':
      return <Waves className="h-3.5 w-3.5" />;
    case 'GraduationCap':
      return <GraduationCap className="h-3.5 w-3.5" />;
    case 'Landmark':
      return <Landmark className="h-3.5 w-3.5" />;
    default:
      return null;
  }
};

const getFoodIcon = (name: string) => {
  switch (name) {
    case 'burger':
      return <BurgerIllustration className="h-9 w-9" />;
    case 'sushi':
      return <ChefPlatterIllustration className="h-9 w-9" />;
    case 'pizza':
      return <PizzaIllustration className="h-9 w-9" />;
    case 'acai':
      return <SaladIllustration className="h-9 w-9" />;
    default:
      return <Utensils className="h-5 w-5" />;
  }
};

const ratingFromId = (value?: string) => {
  const seed = (value || 'filterfood').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (4.2 + (seed % 7) / 10).toFixed(1);
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const getBustedUrl = useImageCacheBuster();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const visto = localStorage.getItem('tutorial_visto');
    if (!visto) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const isRestaurantOpen = (restaurant: any) => {
    if (restaurant.opening_hours) {
      try {
        const status = getRestaurantOpenStatus(restaurant.opening_hours);
        return status.isOpen;
      } catch (e) {
        // Fallback below.
      }
    }

    const hour = new Date().getHours();
    return hour >= 11 && hour < 22;
  };

  const locationDisplayName = useMemo(() => {
    if (!location.address) return 'Definir endereço';

    if (location.address.includes('Cabo Branco') && location.address.includes('2000')) {
      return 'Cabo Branco';
    }

    const parts = location.address.split(',');
    if (parts.length >= 2) {
      const streetPart = parts[0].trim();
      const neighborhoodPart = parts[1].trim();
      const isNumberOrShort = /^\d+$/.test(streetPart) || streetPart.length <= 4 || streetPart.toLowerCase().includes('unnamed');

      if (isNumberOrShort && neighborhoodPart) {
        return neighborhoodPart;
      }

      return streetPart.replace(/^rua\s+/i, 'R. ').replace(/^avenida\s+/i, 'Av. ');
    }

    return location.address.split(',')[0]?.trim() || location.address;
  }, [location]);

  const userLat = location.latitude;
  const userLon = location.longitude;

  const { data: restaurants, isLoading: isRestaurantsLoading } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: userLat !== null && userLon !== null,
    searchQuery,
    limit: 10,
    offset: 0,
  });

  const runSearch = (query = searchQuery, searchType: 'dish' | 'restaurant' = 'dish') => {
    if (userLat === null || userLon === null) {
      showError('Aguarde enquanto obtemos sua localização.');
      return;
    }

    navigate(createPageUrl('search', undefined, {
      searchQuery: query.trim(),
      searchType,
    }));
  };

  const handleSearchSubmit = (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    runSearch(searchQuery);
  };

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];

    let list = restaurants;
    if (selectedRegion !== 'all') {
      const regionData = MACRO_REGIONS.find((region) => region.id === selectedRegion);
      if (regionData && regionData.neighborhoods.length > 0) {
        list = restaurants.filter((restaurant) => {
          const restaurantNeighborhood = normalize(restaurant.neighborhood);
          return regionData.neighborhoods.some((neighborhood) => {
            const normalizedRegionNeighborhood = normalize(neighborhood);
            return restaurantNeighborhood.includes(normalizedRegionNeighborhood) || normalizedRegionNeighborhood.includes(restaurantNeighborhood);
          });
        });
      }
    }

    let categoryFiltered = list;
    if (selectedCategory === 'favorites') {
      categoryFiltered = list.filter((restaurant) => isFavorite(restaurant.id));
    } else if (selectedCategory === 'combos') {
      categoryFiltered = list.filter((restaurant) => normalize(restaurant.category).includes('combo') || normalize(restaurant.name).includes('combo'));
    } else if (selectedCategory === 'lanches') {
      categoryFiltered = list.filter((restaurant) => {
        const category = normalize(restaurant.category);
        return category.includes('lanche') || category.includes('hamburg') || category.includes('burg');
      });
    } else if (selectedCategory === 'sobremesas') {
      categoryFiltered = list.filter((restaurant) => {
        const category = normalize(restaurant.category);
        return category.includes('sobremesa') || category.includes('doce') || category.includes('sorvete') || category.includes('acai');
      });
    } else if (selectedCategory === 'pizza') {
      categoryFiltered = list.filter((restaurant) => normalize(restaurant.category).includes('pizza'));
    } else if (selectedCategory === 'saudavel') {
      categoryFiltered = list.filter((restaurant) => {
        const category = normalize(restaurant.category);
        return category.includes('saudavel') || category.includes('salada') || category.includes('fit') || category.includes('vegano') || category.includes('vegetariano');
      });
    }

    return [...categoryFiltered].sort((a, b) => {
      const aOpen = isRestaurantOpen(a);
      const bOpen = isRestaurantOpen(b);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return (a.distance_km || 0) - (b.distance_km || 0);
    });
  }, [restaurants, selectedCategory, selectedRegion, isFavorite]);

  const nearbyPreview = filteredRestaurants.slice(0, 4);

  return (
    <div className="w-full flex-grow bg-[var(--ff-background)] font-['Poppins'] text-[var(--ff-text-primary)]">
      <div className="px-5 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-['Lobster'] text-[34px] leading-none text-[var(--ff-primary)] drop-shadow-[0_10px_22px_rgba(223,75,28,0.08)]">
              FilterFood
            </h1>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="mt-2 flex max-w-[220px] items-center gap-1.5 rounded-full text-[13px] font-semibold text-[#5E6675] transition-colors hover:text-[var(--ff-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/30"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[var(--ff-primary)]" />
              <span className="truncate">{isLocationLoading ? 'Carregando...' : locationDisplayName}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[var(--ff-primary)] bg-white p-1 shadow-[0_10px_24px_rgba(223,75,28,0.16)] transition-transform active:scale-95"
            aria-label="Abrir perfil"
          >
            <img
              src="/images/filterfood_avatar_home_tray.png"
              alt=""
              className="h-full w-full rounded-full object-cover object-[48%_18%]"
            />
          </button>
        </header>
      </div>

      <section className="mx-5 overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_78%_18%,#ff9b56_0%,#ff5a2a_42%,#df4b1c_100%)] p-4 text-white shadow-[0_22px_42px_rgba(223,75,28,0.22)]">
        <div className="relative">
          <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full border border-white/14" />
          <div className="pointer-events-none absolute -right-8 top-14 h-44 w-44 rounded-full border border-white/10" />
          <div
            className="pointer-events-none absolute left-[44%] top-[18%] h-20 w-24 opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1.5px, transparent 1.7px)',
              backgroundSize: '14px 14px',
            }}
          />

          <img
            src="/images/filterfood_avatar_home_tray.png"
            alt=""
            className="pointer-events-none absolute -right-[54px] top-7 h-[214px] w-[268px] object-contain object-bottom opacity-95 drop-shadow-[0_24px_42px_rgba(99,34,13,0.22)]"
          />

          <div className="relative z-10 max-w-[190px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/24 bg-white/12 px-3.5 py-2 text-[12px] font-bold shadow-[0_12px_26px_rgba(91,31,10,0.12)] backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              IA do FilterFood
            </div>

            <h2 className="mt-4 text-[clamp(23px,6vw,27px)] font-bold leading-[1.12] tracking-tight">
              O que comer hoje?
            </h2>
            <p className="mt-2 max-w-[178px] text-[12px] font-medium leading-snug text-white/82">
              Pratos, preços e cardápios perto de você.
            </p>
          </div>

          <form
            id="tour-search-bar"
            onSubmit={handleSearchSubmit}
            className="relative z-30 mt-5 flex min-h-[50px] items-center gap-3 rounded-full bg-white px-4 text-[#3C2F2F] shadow-[0_18px_34px_rgba(91,31,10,0.18)]"
          >
            <Sparkles className="h-6 w-6 shrink-0 text-[var(--ff-primary)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Prato ou restaurante"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-[#8A8F9B]"
            />
            <button
              type="button"
              onClick={() => runSearch(searchQuery)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E9FBFA] text-[#079C9C] transition-transform active:scale-95"
              aria-label="Buscar por voz ou IA"
            >
              <Mic2 className="h-5 w-5" />
            </button>
          </form>

          <ScrollArea className="relative z-30 mt-3 whitespace-nowrap">
            <div className="flex gap-2.5 pb-1">
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(item.query);
                    runSearch(item.query);
                  }}
                  className="inline-flex min-h-[42px] min-w-[86px] items-center gap-2 rounded-[16px] border border-white/22 bg-white/12 px-2.5 text-left text-[11px] font-bold leading-tight text-white backdrop-blur-md transition-transform active:scale-95"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/12">
                    {getFoodIcon(item.icon)}
                  </span>
                  <span className="whitespace-normal">{item.label}</span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>
      </section>

      <section className="mx-5 mt-4 rounded-[28px] border border-[var(--ff-border-soft)] bg-white p-3.5 shadow-[var(--ff-shadow-card)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0EA] text-[var(--ff-primary)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-bold leading-tight tracking-tight text-[#252228]">
                Cardápios
              </h3>
              <p className="truncate text-[12px] font-medium text-[#6B7280]">
                Cidade inteira
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => runSearch('', 'restaurant')}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#F6CBBF] px-3 text-[12px] font-bold text-[var(--ff-primary)] transition-colors hover:bg-[#FFF5F1]"
          >
            Explorar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="grid grid-flow-col auto-cols-[101px] gap-2.5 pb-1 min-[420px]:auto-cols-[116px]">
            {CITY_MENU_CARDS.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => runSearch(card.title, 'restaurant')}
                className="group relative h-[132px] overflow-hidden rounded-[16px] bg-slate-100 text-left shadow-[0_10px_24px_rgba(31,41,55,0.08)]"
              >
                <img src={card.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
                  <p className="truncate text-[12px] font-bold">{card.title}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-white/78">{card.meta}</p>
                </div>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      <section className="mt-4 pl-5">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pr-5 pb-2 pt-1">
            {CATEGORY_OPTIONS.map((category) => {
              const isSelected = selectedCategory === category.id;
              const IconComponent = category.icon;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex min-w-[64px] flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  <span
                    className={cn(
                      'flex h-[66px] w-[66px] items-center justify-center rounded-[24px] border transition-all duration-200',
                      isSelected
                        ? 'border-[#F6CBBF] bg-white text-[var(--ff-primary)] shadow-[0_14px_26px_rgba(223,75,28,0.10)]'
                        : 'border-[var(--ff-border-soft)] bg-white/86 text-[#5E6675] shadow-[0_10px_22px_rgba(31,41,55,0.04)]',
                    )}
                  >
                    <IconComponent className="h-10 w-10" />
                  </span>
                  <span className={cn('text-[12.5px] font-bold', isSelected ? 'text-[var(--ff-primary)]' : 'text-[#667085]')}>
                    {category.label}
                  </span>
                  {isSelected && <span className="h-1 w-9 rounded-full bg-[var(--ff-primary)]" />}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      <section className="mt-4 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold tracking-tight text-[#252228]">Pratos recomendados</h2>
          <button
            type="button"
            onClick={() => runSearch(searchQuery)}
            className="flex items-center gap-1 text-[13px] font-bold text-[var(--ff-primary)]"
          >
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="-mx-5 whitespace-nowrap px-5">
          <div className="flex gap-3 pb-2">
            {RECOMMENDED_DISHES.map((dish) => (
              <button
                key={dish.title}
                type="button"
                onClick={() => {
                  setSearchQuery(dish.query);
                  runSearch(dish.query);
                }}
                className="relative w-[168px] shrink-0 overflow-hidden rounded-[21px] border border-[var(--ff-border-soft)] bg-white text-left shadow-[var(--ff-shadow-card)] transition-transform active:scale-[0.98]"
              >
                <div className="relative h-[118px] overflow-hidden bg-slate-100">
                  <img src={dish.image} alt="" className="h-full w-full object-cover" />
                  <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#252228] shadow-sm">
                    <Heart className="h-4 w-4" />
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="truncate text-[14px] font-extrabold leading-tight text-[#252228]">{dish.title}</h3>
                  <p className="mt-1 text-[14px] font-extrabold text-[var(--ff-primary)]">{dish.price}</p>
                  <p className="mt-0.5 truncate text-[11.5px] font-semibold text-[#6B7280]">{dish.restaurant}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-[#98A2B3]">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {dish.meta}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      <section id="tour-happy-hour-card" className="mx-5 mt-4 rounded-[26px] border border-[var(--ff-border-soft)] bg-white p-3 shadow-[var(--ff-shadow-card)]">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#FFF0D9] text-[var(--ff-primary)]">
            <Users className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[16px] font-extrabold text-[#252228]">Happy Hour & Com amigos</h3>
            <p className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-[#6B7280]">
              Crie grupos, vote nos pratos e decida onde comer junto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/happy-hours')}
            className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-[#F6CBBF] px-4 text-[13px] font-bold text-[var(--ff-primary)] min-[390px]:flex"
          >
            Explorar
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/happy-hours?create=true')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ff-primary)] text-white shadow-[0_12px_22px_rgba(223,75,28,0.18)] min-[390px]:hidden"
            aria-label="Criar grupo"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </section>

      <section className="mt-5 px-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-extrabold tracking-tight text-[#252228]">Perto de você</h2>
            <p className="text-[13px] font-medium text-[#6B7280]">Cardápios reais na sua região</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(createPageUrl('search'))}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ff-border-soft)] bg-white text-[var(--ff-primary)] shadow-sm"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 hide-scrollbar">
          {MACRO_REGIONS.map((region) => {
            const isActive = selectedRegion === region.id;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => setSelectedRegion(region.id)}
                className={cn(
                  'flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all duration-200',
                  isActive
                    ? 'bg-[var(--ff-primary)] text-white shadow-[0_8px_16px_rgba(223,75,28,0.16)]'
                    : 'border border-[var(--ff-border-soft)] bg-white text-[#667085] shadow-sm',
                )}
              >
                {getRegionIcon(region.iconName)}
                <span>{region.label}</span>
              </button>
            );
          })}
        </div>

        <div id="tour-restaurants-list" className="flex flex-col gap-3 pb-8">
          {isRestaurantsLoading ? (
            [1, 2, 3].map((item) => (
              <div key={item} className="flex h-[108px] gap-3 rounded-[22px] border border-[var(--ff-border-soft)] bg-white p-3 shadow-[var(--ff-shadow-card)]">
                <Skeleton className="h-[84px] w-[84px] shrink-0 rounded-[18px]" />
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-5 w-40 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded-full" />
                </div>
              </div>
            ))
          ) : nearbyPreview.length > 0 ? (
            nearbyPreview.map((restaurant) => {
              const isOpen = isRestaurantOpen(restaurant);
              const rating = ratingFromId(restaurant.id || restaurant.name);

              return (
                <div
                  key={restaurant.id}
                  onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                  className="flex min-h-[108px] cursor-pointer items-center gap-3 rounded-[22px] border border-[var(--ff-border-soft)] bg-white p-3 text-left shadow-[var(--ff-shadow-card)] transition-transform duration-200 active:scale-[0.99]"
                >
                  <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[18px] bg-slate-100">
                    <img
                      src={getBustedUrl(restaurant.image_url) || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop'}
                      alt={restaurant.name}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        (event.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
                      }}
                    />
                    <span className={cn('absolute left-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white', isOpen ? 'bg-emerald-400' : 'bg-slate-300')} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="truncate text-[10px] font-extrabold uppercase tracking-wide text-[var(--ff-primary)]">
                        {restaurant.category || 'Cardápio'}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold', isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400')}>
                        <Clock className="h-3 w-3" />
                        {isOpen ? 'Aberto' : 'Fechado'}
                      </span>
                    </div>
                    <h3 className="truncate text-[15px] font-extrabold leading-tight text-[#252228]">{restaurant.name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#667085]">
                      <span className="flex items-center gap-1 text-[#252228]">
                        <Star className="h-3.5 w-3.5 fill-[#FF9633] text-[#FF9633]" />
                        {rating}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>{restaurant.distance_km?.toFixed(1) || '1.2'} km</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(restaurant.id, isFavorite(restaurant.id));
                    }}
                    className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors', isFavorite(restaurant.id) ? 'bg-[#FFF0EA] text-[var(--ff-primary)]' : 'bg-slate-50 text-slate-400')}
                    aria-label="Favoritar restaurante"
                  >
                    <Heart className={cn('h-5 w-5', isFavorite(restaurant.id) && 'fill-[var(--ff-primary)]')} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-[var(--ff-border-soft)] bg-white p-8 text-center shadow-[var(--ff-shadow-card)]">
              <Store className="mx-auto h-8 w-8 text-[var(--ff-primary)]" />
              <p className="mt-3 text-sm font-semibold text-[#667085]">Nenhum restaurante encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </section>

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
