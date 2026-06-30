import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Star, Heart, Users, Sparkles, Plus, Eye, MapPin, ChevronDown, X, Play, ChevronLeft, ChevronRight, ExternalLink, Map, Waves, GraduationCap, Landmark } from 'lucide-react';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { createPageUrl } from '@/utils/url';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import SoftSearchInput from '@/components/search/SoftSearchInput';
import ClientBottomNav from '@/components/ClientBottomNav';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthData } from '@/context/AuthContext';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { cn } from '@/lib/utils';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import Header from '@/components/Header';
import {
  ChefPlatterIllustration,
  ComboIllustration,
  BurgerIllustration,
  CupcakeIllustration,
  PizzaIllustration,
  SaladIllustration
} from '@/components/icons/CategoryDrawings';
import { FeatureTour } from '@/components/onboarding/FeatureTour';

const MACRO_REGIONS = [
  {
    id: 'all',
    label: 'Todos Bairros',
    iconName: 'Map',
    neighborhoods: []
  },
  {
    id: 'orla',
    label: 'Orla',
    iconName: 'Waves',
    neighborhoods: ['tambaÃº', 'tambau', 'cabo branco', 'manaÃ­ra', 'manaira', 'bessa', 'jardim oceania', 'altiplano', 'aeroclube', 'ponta de campina', 'intermares']
  },
  {
    id: 'zona_sul',
    label: 'Zona Sul',
    iconName: 'GraduationCap',
    neighborhoods: ['bancÃ¡rios', 'bancarios', 'mangabeira', 'geisel', 'ernesto geisel', 'valentina', 'valentina de figueiredo', 'castelo branco', 'portal do sol', 'josÃ© amÃ©rico', 'jose americo', 'cidade universitÃ¡ria', 'cidade universitaria']
  },
  {
    id: 'centro_norte',
    label: 'Centro / Norte',
    iconName: 'Landmark',
    neighborhoods: ['centro', 'torre', 'tambiÃ¡', 'tambia', 'bairro dos estados', 'estados', 'jaguaribe', 'mandacaru', 'roger', 'padre zÃ©', 'padre ze', 'miramar', 'tambauzinho', 'expedicionÃ¡rios', 'expedicionarios']
  }
];

const getRegionIcon = (iconName: string) => {
  switch (iconName) {
    case 'Map':
      return <Map className="w-3.5 h-3.5" />;
    case 'Waves':
      return <Waves className="w-3.5 h-3.5" />;
    case 'GraduationCap':
      return <GraduationCap className="w-3.5 h-3.5" />;
    case 'Landmark':
      return <Landmark className="w-3.5 h-3.5" />;
    default:
      return null;
  }
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const getBustedUrl = useImageCacheBuster();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { restaurant } = useAuthData();
  const isRestaurantOwner = !!restaurant;
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const visto = localStorage.getItem('tutorial_visto');
    if (!visto) {
      // Pequeno delay para garantir que os elementos jÃ¡ foram renderizados no DOM
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const isRestaurantOpen = (r: any) => {
    if (r.opening_hours) {
      try {
        const status = getRestaurantOpenStatus(r.opening_hours);
        return status.isOpen;
      } catch (e) {
        // Fallback
      }
    }
    const hour = new Date().getHours();
    return hour >= 11 && hour < 22;
  };

  const recommendedPosts = useMemo(() => [
    {
      id: 'post-1',
      restaurantId: '1',
      restaurantName: 'Sabor Premium',
      restaurantLogo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=600&fit=crop',
      caption: 'A verdadeira pizza artesanal com borda recheada e muuuito queijo! ðŸ•ðŸ¤¤',
      likes: 124
    },
    {
      id: 'post-2',
      restaurantId: '2',
      restaurantName: 'Lancheira do ZÃ©',
      restaurantLogo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=600&fit=crop',
      caption: 'Smash Burger duplo artesanal saindo quentinho na chapa! ðŸ”ðŸ”¥',
      likes: 98
    },
    {
      id: 'post-3',
      restaurantId: '3',
      restaurantName: 'Doce Sonho CaffÃ©',
      restaurantLogo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100&h=100&fit=crop',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?w=400&h=600&fit=crop',
      caption: 'Melhor forma de comeÃ§ar o dia: panquecas fofinhas e muito mel! ðŸ¥žâ˜•',
      likes: 85
    },
    {
      id: 'post-4',
      restaurantId: '4',
      restaurantName: 'Chefs Salad Bar',
      restaurantLogo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&h=100&fit=crop',
      type: 'photo',
      mediaUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=600&fit=crop',
      caption: 'Ingredientes frescos e selecionados para a sua salada perfeita. ðŸ¥—ðŸ’š',
      likes: 64
    }
  ], []);

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  useEffect(() => {
    if (activeStoryIndex === null) return;
    
    setStoryProgress(0);
    const duration = 6000; // 6 segundos por histÃ³ria
    const intervalTime = 100;
    const step = (intervalTime / duration) * 100;
    
    const timer = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          if (activeStoryIndex < recommendedPosts.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
          } else {
            setActiveStoryIndex(null); // Fechar ao terminar tudo
          }
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);
    
    return () => clearInterval(timer);
  }, [activeStoryIndex, recommendedPosts]);

  const handlePrevStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeStoryIndex === null) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
    } else {
      setStoryProgress(0);
    }
  };

  const handleNextStory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeStoryIndex === null) return;
    if (activeStoryIndex < recommendedPosts.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
    } else {
      setActiveStoryIndex(null);
    }
  };

  // Parsear amigavelmente o endereÃ§o para exibiÃ§Ã£o compacta (ex: Bairro ou Rua)
  const locationDisplayName = useMemo(() => {
    if (!location.address) return 'Definir endereÃ§o';
    
    // EndereÃ§o de mock padrÃ£o
    if (location.address.includes("Cabo Branco") && location.address.includes("2000")) {
      return "Cabo Branco";
    }

    const parts = location.address.split(',');
    if (parts.length >= 2) {
      const streetPart = parts[0].trim();
      const neighborhoodPart = parts[1].trim();

      // Se a rua for sÃ³ nÃºmero, CEP, "unnamed", ou muito curta (ex: "070"), exibe o bairro
      const isNumberOrShort = /^\d+$/.test(streetPart) || streetPart.length <= 4 || streetPart.toLowerCase().includes('unnamed');
      if (isNumberOrShort && neighborhoodPart) {
        return neighborhoodPart;
      }

      // Se for rua vÃ¡lida, formata de forma premium e encurtada (Rua -> R., Avenida -> Av.)
      let display = streetPart;
      display = display.replace(/^rua\s+/i, 'R. ');
      display = display.replace(/^avenida\s+/i, 'Av. ');
      return display;
    }

    return location.address.split(',')[0]?.trim() || location.address;
  }, [location]);

  const userLat = location.latitude;
  const userLon = location.longitude;

  const { data: restaurants, isLoading: isRestaurantsLoading } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: userLat !== null && userLon !== null,
    searchQuery: searchQuery,
    limit: 10,
    offset: 0,
  });

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localizaÃ§Ã£o.");
      return;
    }
    navigate(createPageUrl('search', undefined, { searchQuery, searchType: 'dish' }));
  };

  const getRestaurantRealId = (name: string, fallbackId: string) => {
    if (!restaurants) return fallbackId;
    const found = restaurants.find(r => r.name.toLowerCase().includes(name.toLowerCase()));
    return found ? found.id : fallbackId;
  };

  // Filtragem local dos restaurantes baseado na categoria e macro-regiÃ£o selecionadas
  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];

    // 1. Filtrar por macro-regiÃ£o
    let list = restaurants;
    if (selectedRegion !== 'all') {
      const regionData = MACRO_REGIONS.find(reg => reg.id === selectedRegion);
      if (regionData && regionData.neighborhoods.length > 0) {
        list = restaurants.filter(r => {
          if (!r.neighborhood) return false;
          const normNeigh = r.neighborhood.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return regionData.neighborhoods.some(n => {
            const normN = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normNeigh.includes(normN) || normN.includes(normNeigh);
          });
        });
      }
    }

    // 2. Filtrar por categoria
    let categoryFiltered = list;
    if (selectedCategory === 'favorites') {
      categoryFiltered = list.filter(r => isFavorite(r.id));
    } else if (selectedCategory === 'combos') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('combo') ||
        r.name?.toLowerCase().includes('combo')
      );
    } else if (selectedCategory === 'lanches') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('lanche') ||
        r.category?.toLowerCase().includes('hambÃºrg') ||
        r.category?.toLowerCase().includes('burg')
      );
    } else if (selectedCategory === 'sobremesas') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('sobremesa') ||
        r.category?.toLowerCase().includes('doce') ||
        r.category?.toLowerCase().includes('sorvete') ||
        r.category?.toLowerCase().includes('aÃ§aÃ­') ||
        r.category?.toLowerCase().includes('acai')
      );
    } else if (selectedCategory === 'pizza') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('pizza')
      );
    } else if (selectedCategory === 'saudavel') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('saudÃ¡vel') ||
        r.category?.toLowerCase().includes('saudavel') ||
        r.category?.toLowerCase().includes('salada') ||
        r.category?.toLowerCase().includes('fit') ||
        r.category?.toLowerCase().includes('vegano') ||
        r.category?.toLowerCase().includes('vegetariano')
      );
    }

    // 3. Ordenar: Abertos primeiro, depois critÃ©rio especÃ­fico
    return [...categoryFiltered].sort((a, b) => {
      const aOpen = isRestaurantOpen(a);
      const bOpen = isRestaurantOpen(b);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;

      // Se ambos tiverem o mesmo status, ordena por proximidade se for categoria "nearby"
      if (selectedCategory === 'nearby') {
        return (a.distance_km || 0) - (b.distance_km || 0);
      }
      return 0; // MantÃ©m ordem original (RPC: plan DESC, etc.)
    });
  }, [restaurants, selectedCategory, selectedRegion, isFavorite]);

  return (
    <div className="w-full flex-grow bg-[#FAFAFA] pt-2 font-['Poppins']">
      
      {/* CabeÃ§alho Sticky Premium */}
      <Header
        title={
          <div className="flex flex-col min-w-0 pr-2 pb-1">
            <h1 className="font-['Lobster'] text-[34px] leading-tight text-highlight">
              FilterFood
            </h1>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="mt-0 flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-highlight active:scale-[0.98]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-highlight" />
              <span className="truncate max-w-[180px]">
                {isLocationLoading ? "Carregando..." : locationDisplayName}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 text-text-secondary" />
            </button>
          </div>
        }
        rightElement={
          <div
            onClick={() => navigate('/profile')}
            className="shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="h-11 w-11 rounded-full border border-highlight/15 bg-highlight/5 p-1 shadow-sm">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=FilterUser&backgroundColor=fef2f2"
                alt="Meu perfil"
                className="w-full h-full rounded-full object-cover bg-white"
              />
            </div>
          </div>
        }
      />

      {/* Barra de Busca */}
      <div id="tour-search-bar" className="mb-6 flex gap-3 px-5">
        <SoftSearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSubmitAction={handleSearchSubmit}
          placeholder="Buscar por pratos ou locais..."
        />
        <button
          onClick={() => handleSearchSubmit()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-slate-100 bg-white text-highlight shadow-soft transition-all duration-200 hover:bg-slate-50 active:scale-95"
        >
          <SlidersHorizontal className="h-5 w-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Bento Grid */}
      <div className="mb-8 grid grid-cols-3 gap-3 px-5">
        {/* Card Happy Hour Hub (2 colunas, 2 linhas) */}
        <div
          id="tour-happy-hour-card"
          onClick={() => navigate('/happy-hours')}
          className="relative col-span-2 row-span-2 flex h-[160px] cursor-pointer flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-tr from-[#df4b1c] to-[#F76A3A] p-5 text-white shadow-[0_8px_22px_rgba(223,75,28,0.16)] transition-transform duration-200 active:scale-[0.99]"
        >
          {/* CÃ­rculos decorativos de fundo */}
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />

          {/* Micro-animaÃ§Ã£o de pulso */}
          <div className="absolute right-4 top-4 flex h-2.5 w-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
          </div>

          <div>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">Social Hub</span>
            <h3 className="mt-2 font-['Poppins'] text-[20px] font-semibold leading-tight">Happy Hour</h3>
            <p className="mt-1 text-xs text-white/90">Convide amigos para sair</p>
          </div>

          <div className="mt-auto flex w-full items-center justify-between gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/happy-hours');
              }}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/15 px-3 py-1.5 text-white transition-all duration-200 active:scale-95"
            >
              <div className="flex -space-x-2">
                <img className="w-6 h-6 rounded-full border border-[#df4b1c]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" alt="Friend 1" />
                <img className="w-6 h-6 rounded-full border border-[#df4b1c]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" alt="Friend 2" />
                <img className="w-6 h-6 rounded-full border border-[#df4b1c]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" alt="Friend 3" />
              </div>
              <span className="text-xs font-semibold">Entrar</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/happy-hours?create=true');
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-white px-3 py-1.5 text-xs font-semibold text-highlight shadow-none transition-all duration-200 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3.5]" />
              <span>Novo RolÃª</span>
            </button>
          </div>
        </div>

        {/* Card Atalho: Amigos */}
        <div
          onClick={() => navigate('/friends')}
          className="flex h-[74px] cursor-pointer flex-col items-start justify-between rounded-[22px] border border-slate-100 bg-white p-4 text-[#3C2F2F] shadow-soft transition-all duration-200 active:scale-95"
        >
          <div className="p-2 rounded-xl bg-[#df4b1c]/10 text-[#df4b1c]">
            <Users className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h4 className="text-xs font-semibold leading-none">Amigos</h4>
        </div>

        {/* Card Categoria: Favoritos ou Meu Perfil */}
        {isRestaurantOwner ? (
          <div
            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            className="flex h-[74px] cursor-pointer flex-col items-start justify-between rounded-[22px] border border-slate-100 bg-white p-4 text-[#3C2F2F] shadow-soft transition-all duration-200 active:scale-95"
          >
            <div className="p-2 rounded-xl bg-[#df4b1c]/10 text-[#df4b1c]">
              <Eye className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-semibold leading-none">Meu Perfil</h4>
          </div>
        ) : (
          <div
            onClick={() => setSelectedCategory('favorites')}
            className={`flex h-[74px] cursor-pointer flex-col items-start justify-between rounded-[22px] border p-4 transition-all duration-200 active:scale-95 ${
              selectedCategory === 'favorites'
                ? 'border-highlight/20 bg-highlight text-white shadow-sm'
                : 'border-slate-100 bg-white text-[#3C2F2F] shadow-soft'
            }`}
          >
            <div className={`p-2 rounded-xl ${selectedCategory === 'favorites' ? 'bg-white/20 text-white' : 'bg-[#df4b1c]/10 text-[#df4b1c]'}`}>
              <Heart className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-semibold leading-none">Favoritos</h4>
          </div>
        )}
      </div>

      {/* SessÃ£o Recomendados (Destaques dos Restaurantes) */}
      <div className="mb-7 pl-5 pt-1">
        <div className="mb-4 flex items-center justify-between pr-5">
          <h2 className="flex items-center gap-1.5 font-['Poppins'] text-[18px] font-semibold text-[#3C2F2F]">
            Recomendados
          </h2>
          <span className="rounded-full bg-highlight/10 px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-highlight">
            Destaques
          </span>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pr-5 pb-2">
            {recommendedPosts.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => setActiveStoryIndex(idx)}
                className="group relative inline-block h-[218px] w-[150px] cursor-pointer overflow-hidden rounded-[22px] border border-slate-100 bg-slate-100 shadow-soft transition-all duration-200 active:scale-[0.98]"
              >
                {/* Media */}
                {post.type === 'video' ? (
                  <video
                    src={post.mediaUrl}
                    className="h-full w-full object-contain pointer-events-none"
                    loop
                    muted
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption}
                    className="h-full w-full object-contain pointer-events-none"
                  />
                )}

                {/* Overlays */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/48 via-black/10 to-transparent" />

                {/* Top header with restaurant name & logo */}
                <div className="absolute left-2.5 right-2.5 top-2.5 z-10 flex max-w-full items-center gap-1.5 rounded-full bg-black/22 py-1 pl-1 pr-2 backdrop-blur-[2px]">
                  <div className="w-6 h-6 rounded-full border border-white/60 p-[1px] bg-white overflow-hidden shrink-0">
                    <img
                      src={post.restaurantLogo}
                      alt={post.restaurantName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="truncate text-[10px] font-semibold text-white">
                    {post.restaurantName}
                  </span>
                </div>



                {/* Play Button Overlay (Videos) */}
                {post.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="p-2 bg-black/40 text-white rounded-full">
                      <Play className="w-4 h-4 fill-white text-white translate-x-[1px]" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Categorias â€” estilo cÃ­rculo com foto + label */}
      <div className="mb-7 pl-5">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pr-5 pb-2 pt-1">
            {[
              { id: 'all', label: 'Tudo', icon: ChefPlatterIllustration },
              { id: 'combos', label: 'Combos', icon: ComboIllustration },
              { id: 'lanches', label: 'Lanches', icon: BurgerIllustration },
              { id: 'sobremesas', label: 'Sobremesas', icon: CupcakeIllustration },
              { id: 'pizza', label: 'Pizza', icon: PizzaIllustration },
              { id: 'saudavel', label: 'SaudÃ¡vel', icon: SaladIllustration },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150"
                >
                  {/* CÃ­rculo com ilustraÃ§Ã£o vetorial */}
                  <div
                    className={`h-16 w-16 rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'border border-highlight/15 bg-highlight/[0.08] shadow-none'
                        : 'border border-slate-100 bg-white shadow-soft'
                    }`}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full transition-colors duration-200">
                      <IconComponent className="h-10 w-10" />
                    </div>
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[12px] font-medium leading-none transition-colors duration-200 ${
                      isSelected ? 'text-highlight' : 'text-text-secondary'
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      {/* Barra de Macro-RegiÃµes */}
      <div className="mb-6 overflow-hidden px-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 hide-scrollbar">
          {MACRO_REGIONS.map((region) => {
            const isActive = selectedRegion === region.id;
            return (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-200",
                  isActive
                    ? "bg-highlight text-white shadow-[0_4px_12px_rgba(223,75,28,0.14)]"
                    : "border border-slate-100 bg-white text-text-secondary shadow-sm hover:bg-slate-50"
                )}
              >
                {getRegionIcon(region.iconName)}
                <span>{region.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Restaurantes (Cards Horizontais) */}
      <div id="tour-restaurants-list" className="flex flex-col gap-3 px-5 pb-32">
        {isRestaurantsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-[100px] items-center gap-3 overflow-hidden rounded-[20px] border border-slate-100 bg-white p-3.5 shadow-soft">
                {/* Shimmer animado â€” Ã¡rea da imagem */}
                <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-100"
                    style={{ animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }}
                  />
                </div>
                {/* Shimmer â€” detalhes */}
                <div className="flex-grow space-y-2">
                  <div className="relative h-4 rounded-lg w-1/3 overflow-hidden bg-slate-100">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-100"
                      style={{ animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }}
                    />
                  </div>
                  <div className="relative h-5 rounded-lg w-3/4 overflow-hidden bg-slate-100">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-100"
                      style={{ animation: 'shimmer 1.6s ease-in-out 0.2s infinite', backgroundSize: '200% 100%' }}
                    />
                  </div>
                  <div className="relative h-3.5 rounded-lg w-1/4 overflow-hidden bg-slate-100">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-100"
                      style={{ animation: 'shimmer 1.6s ease-in-out 0.4s infinite', backgroundSize: '200% 100%' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : filteredRestaurants && filteredRestaurants.length > 0 ? (
          filteredRestaurants.map((restaurant) => {
            const mockRating = (4 + (Math.random() * 0.9)).toFixed(1);
            const isOpen = isRestaurantOpen(restaurant);

            return (
              <div 
                key={restaurant.id} 
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                className="flex min-h-[100px] cursor-pointer items-center gap-3 rounded-[20px] border border-slate-100 bg-white p-3.5 shadow-soft transition-all duration-200 hover:translate-y-[-1px]"
              >
                {/* Imagem do Restaurante */}
                <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                  <img 
                    src={getBustedUrl(restaurant.image_url) || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop'} 
                    alt={restaurant.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
                    }}
                  />
                </div>

                {/* ConteÃºdo */}
                <div className="flex min-w-0 flex-grow flex-col justify-center pr-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-highlight/85">
                      {restaurant.category || 'Geral'}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide",
                      isOpen 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-slate-50 text-slate-400"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", isOpen ? "bg-emerald-400" : "bg-slate-300")} />
                      {isOpen ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                  <h3 className="truncate text-[15px] font-semibold leading-tight text-[#3C2F2F]">
                    {restaurant.name}
                  </h3>
                  
                  <div className="mt-1.5 flex items-center gap-2 text-xs font-normal text-text-secondary">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-[#FF9633] text-[#FF9633]" />
                      <span className="font-semibold text-[#3C2F2F]">{mockRating}</span>
                    </div>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-slate-400">a {restaurant.distance_km?.toFixed(1) || '1.2'} km</span>
                  </div>
                </div>

                {/* Favorito */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(restaurant.id, isFavorite(restaurant.id));
                  }}
                  className={`shrink-0 rounded-full p-1.5 transition-colors ${
                    isFavorite(restaurant.id) 
                      ? 'text-highlight hover:text-highlight/80' 
                      : 'text-slate-400 hover:text-highlight'
                  }`}
                >
                  <Heart className={`h-5 w-5 stroke-[2] ${isFavorite(restaurant.id) ? 'fill-highlight' : ''}`} />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-[#6A6A6A] w-full bg-white rounded-[20px] border border-slate-100 shadow-soft">
            <p>Nenhum restaurante encontrado nesta categoria.</p>
          </div>
        )}
      </div>

      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={refetchLocation}
      />

      {/* Modal Visualizador de Destaques (Stories) */}
      {activeStoryIndex !== null && createPortal(
        <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[100] bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md">
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full mt-2">
            {recommendedPosts.map((_, idx) => (
              <div key={idx} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width:
                      idx < activeStoryIndex
                        ? '100%'
                        : idx === activeStoryIndex
                        ? `${storyProgress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="flex justify-between items-center w-full text-white mt-4 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full border border-white/40 p-[1px] bg-white overflow-hidden shrink-0">
                <img
                  src={recommendedPosts[activeStoryIndex].restaurantLogo}
                  alt={recommendedPosts[activeStoryIndex].restaurantName}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">
                  {recommendedPosts[activeStoryIndex].restaurantName}
                </span>
                <span className="text-[10px] text-white/60 mt-0.5">Destaque recomendado</span>
              </div>
            </div>

            <button
              onClick={() => setActiveStoryIndex(null)}
              className="p-1.5 hover:bg-white/10 text-white rounded-full transition-colors border-none cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Media Body */}
          <div className="flex-grow flex items-center justify-center relative my-6">
            {/* Clickable regions for prev/next navigation */}
            <div
              onClick={handlePrevStory}
              className="absolute left-0 top-0 bottom-0 w-[30%] z-20 cursor-pointer"
            />
            <div
              onClick={handleNextStory}
              className="absolute right-0 top-0 bottom-0 w-[70%] z-20 cursor-pointer"
            />

            {/* Content */}
            {recommendedPosts[activeStoryIndex].type === 'video' ? (
              <video
                key={recommendedPosts[activeStoryIndex].id}
                src={recommendedPosts[activeStoryIndex].mediaUrl}
                className="max-w-full max-h-[68vh] rounded-2xl object-contain shadow-2xl z-10"
                loop
                muted
                autoPlay
                playsInline
              />
            ) : (
              <img
                key={recommendedPosts[activeStoryIndex].id}
                src={recommendedPosts[activeStoryIndex].mediaUrl}
                alt={recommendedPosts[activeStoryIndex].caption}
                className="max-w-full max-h-[68vh] rounded-2xl object-contain shadow-2xl z-10"
              />
            )}

            {/* Left & Right arrow indicators (desktop-friendly overlay) */}
            {activeStoryIndex > 0 && (
              <button
                onClick={handlePrevStory}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full z-30 transition-all active:scale-90 border-none cursor-pointer hidden sm:flex"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeStoryIndex < recommendedPosts.length - 1 && (
              <button
                onClick={handleNextStory}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full z-30 transition-all active:scale-90 border-none cursor-pointer hidden sm:flex"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Footer details */}
          <div className="flex flex-col gap-4 pb-6 text-white px-2 z-30">
            <p className="text-sm font-semibold leading-snug text-white/95">
              {recommendedPosts[activeStoryIndex].caption}
            </p>
            <Button
              onClick={() => {
                const targetId = getRestaurantRealId(
                  recommendedPosts[activeStoryIndex].restaurantName,
                  recommendedPosts[activeStoryIndex].restaurantId
                );
                setActiveStoryIndex(null);
                navigate(createPageUrl('restaurantProfile', { restaurantId: targetId }));
              }}
              className="w-full bg-[#df4b1c] hover:bg-[#df4b1c]/90 text-white font-bold h-12 rounded-[18px] flex items-center justify-center gap-2 active:scale-98 transition-transform border-none cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Restaurante e CardÃ¡pio
            </Button>
          </div>
        </div>,
        document.body
      )}

      {showTour && <FeatureTour onClose={() => setShowTour(false)} />}
    </div>
  );
};

export default Home;
