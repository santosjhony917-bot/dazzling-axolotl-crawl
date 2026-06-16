import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Star, Heart, Users, Sparkles, Plus, Eye, MapPin, ChevronDown, X, Play, ChevronLeft, ChevronRight, ExternalLink, Map, Waves, GraduationCap, Landmark } from 'lucide-react';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import { createPageUrl } from '@/utils/url';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import SoftSearchInput from '@/components/search/SoftSearchInput';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthData } from '@/context/AuthContext';
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
    neighborhoods: ['tambaú', 'tambau', 'cabo branco', 'manaíra', 'manaira', 'bessa', 'jardim oceania', 'altiplano', 'aeroclube', 'ponta de campina', 'intermares']
  },
  {
    id: 'zona_sul',
    label: 'Zona Sul',
    iconName: 'GraduationCap',
    neighborhoods: ['bancários', 'bancarios', 'mangabeira', 'geisel', 'ernesto geisel', 'valentina', 'valentina de figueiredo', 'castelo branco', 'portal do sol', 'josé américo', 'jose americo', 'cidade universitária', 'cidade universitaria']
  },
  {
    id: 'centro_norte',
    label: 'Centro / Norte',
    iconName: 'Landmark',
    neighborhoods: ['centro', 'torre', 'tambiá', 'tambia', 'bairro dos estados', 'estados', 'jaguaribe', 'mandacaru', 'roger', 'padre zé', 'padre ze', 'miramar', 'tambauzinho', 'expedicionários', 'expedicionarios']
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
      // Pequeno delay para garantir que os elementos já foram renderizados no DOM
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
      type: 'video',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-delicious-pizza-slice-lifted-with-cheese-stretch-41585-large.mp4',
      caption: 'A verdadeira pizza artesanal com borda recheada e muuuito queijo! 🍕🤤',
      likes: 124
    },
    {
      id: 'post-2',
      restaurantId: '2',
      restaurantName: 'Lancheira do Zé',
      restaurantLogo: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&h=100&fit=crop',
      type: 'video',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-hamburger-on-a-plate-41618-large.mp4',
      caption: 'Smash Burger duplo artesanal saindo quentinho na chapa! 🍔🔥',
      likes: 98
    },
    {
      id: 'post-3',
      restaurantId: '3',
      restaurantName: 'Doce Sonho Caffé',
      restaurantLogo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100&h=100&fit=crop',
      type: 'video',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-honey-on-pancakes-41613-large.mp4',
      caption: 'Melhor forma de começar o dia: panquecas fofinhas e muito mel! 🥞☕',
      likes: 85
    },
    {
      id: 'post-4',
      restaurantId: '4',
      restaurantName: 'Chefs Salad Bar',
      restaurantLogo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&h=100&fit=crop',
      type: 'video',
      mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-fresh-vegetable-salad-41586-large.mp4',
      caption: 'Ingredientes frescos e selecionados para a sua salada perfeita. 🥗💚',
      likes: 64
    }
  ], []);

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  useEffect(() => {
    if (activeStoryIndex === null) return;
    
    setStoryProgress(0);
    const duration = 6000; // 6 segundos por história
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

  // Parsear amigavelmente o endereço para exibição compacta (ex: Bairro ou Rua)
  const locationDisplayName = useMemo(() => {
    if (!location.address) return 'Definir endereço';
    
    // Endereço de mock padrão
    if (location.address.includes("Cabo Branco") && location.address.includes("2000")) {
      return "Cabo Branco";
    }

    const parts = location.address.split(',');
    if (parts.length >= 2) {
      const streetPart = parts[0].trim();
      const neighborhoodPart = parts[1].trim();

      // Se a rua for só número, CEP, "unnamed", ou muito curta (ex: "070"), exibe o bairro
      const isNumberOrShort = /^\d+$/.test(streetPart) || streetPart.length <= 4 || streetPart.toLowerCase().includes('unnamed');
      if (isNumberOrShort && neighborhoodPart) {
        return neighborhoodPart;
      }

      // Se for rua válida, formata de forma premium e encurtada (Rua -> R., Avenida -> Av.)
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
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    navigate(createPageUrl('search', undefined, { searchQuery, searchType: 'dish' }));
  };

  const getRestaurantRealId = (name: string, fallbackId: string) => {
    if (!restaurants) return fallbackId;
    const found = restaurants.find(r => r.name.toLowerCase().includes(name.toLowerCase()));
    return found ? found.id : fallbackId;
  };

  // Filtragem local dos restaurantes baseado na categoria e macro-região selecionadas
  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];

    // 1. Filtrar por macro-região
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
        r.category?.toLowerCase().includes('hambúrg') ||
        r.category?.toLowerCase().includes('burg')
      );
    } else if (selectedCategory === 'sobremesas') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('sobremesa') ||
        r.category?.toLowerCase().includes('doce') ||
        r.category?.toLowerCase().includes('sorvete') ||
        r.category?.toLowerCase().includes('açaí') ||
        r.category?.toLowerCase().includes('acai')
      );
    } else if (selectedCategory === 'pizza') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('pizza')
      );
    } else if (selectedCategory === 'saudavel') {
      categoryFiltered = list.filter(r =>
        r.category?.toLowerCase().includes('saudável') ||
        r.category?.toLowerCase().includes('saudavel') ||
        r.category?.toLowerCase().includes('salada') ||
        r.category?.toLowerCase().includes('fit') ||
        r.category?.toLowerCase().includes('vegano') ||
        r.category?.toLowerCase().includes('vegetariano')
      );
    }

    // 3. Ordenar: Abertos primeiro, depois critério específico
    return [...categoryFiltered].sort((a, b) => {
      const aOpen = isRestaurantOpen(a);
      const bOpen = isRestaurantOpen(b);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;

      // Se ambos tiverem o mesmo status, ordena por proximidade se for categoria "nearby"
      if (selectedCategory === 'nearby') {
        return (a.distance_km || 0) - (b.distance_km || 0);
      }
      return 0; // Mantém ordem original (RPC: plan DESC, etc.)
    });
  }, [restaurants, selectedCategory, selectedRegion, isFavorite]);

  return (
    <div className="bg-white w-full flex-grow pt-8 font-['Poppins']">

      {/* Cabeçalho */}
      <div className="px-5 mb-6 flex justify-between items-start">
        <div className="flex flex-col min-w-0 pr-2">
          <div className="bg-gradient-to-r from-[#FF7E40] to-[#EF2A39] rounded-2xl px-4 py-1.5 inline-flex items-center mb-0.5">
            <img src="/assets/filterfood-logo.png" alt="FilterFood" className="h-7 w-auto" />
          </div>
          {/* Seletor de localização interativo */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#6A6A6A] hover:text-[#EF2A39] transition-colors mt-1 font-semibold active:scale-[0.98] cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#EF2A39] shrink-0" />
            <span className="truncate max-w-[180px]">
              {isLocationLoading ? "Carregando..." : locationDisplayName}
            </span>
            <ChevronDown className="w-3 h-3 text-[#6A6A6A] shrink-0" />
          </button>
        </div>

        {/* Avatar circular — foto de perfil */}
        <div
          onClick={() => navigate('/profile')}
          className="shrink-0 mt-2 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-[52px] h-[52px] rounded-full p-[2.5px] bg-gradient-to-br from-[#FF7E40] to-[#EF2A39] shadow-[0_6px_18px_rgba(239,42,57,0.30)]">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=FilterUser&backgroundColor=fef2f2"
              alt="Meu perfil"
              className="w-full h-full rounded-full object-cover bg-white"
            />
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div id="tour-search-bar" className="px-5 mb-8 flex gap-4">
        <SoftSearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSubmitAction={handleSearchSubmit}
          placeholder="Buscar por pratos ou locais..."
        />
        <button
          onClick={() => handleSearchSubmit()}
          className="shrink-0 h-[60px] w-[60px] bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white rounded-[20px] shadow-[0_12px_24px_rgba(239,42,57,0.28)] flex items-center justify-center transition-all duration-200 active:scale-95 border-none"
        >
          <SlidersHorizontal className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-3 gap-4 px-5 mb-8">
        {/* Card Happy Hour Hub (2 colunas, 2 linhas) */}
        <div
          id="tour-happy-hour-card"
          onClick={() => navigate('/happy-hours')}
          className="col-span-2 row-span-2 bg-gradient-to-br from-[#EF2A39] to-[#C41230] rounded-[24px] p-5 flex flex-col justify-between text-white shadow-[0_14px_32px_rgba(239,42,57,0.32)] relative overflow-hidden active:scale-[0.98] transition-transform duration-200 cursor-pointer h-[184px]"
        >
          {/* Círculos decorativos de fundo */}
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/8 pointer-events-none" />

          {/* Micro-animação de pulso */}
          <div className="absolute top-4 right-4 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-white/80 bg-white/20 px-2 py-0.5 rounded-full">Social Hub</span>
            <h3 className="font-['Poppins'] font-bold text-xl mt-2 leading-tight">Happy Hour</h3>
            <p className="text-xs text-white/90 mt-1">Amigos ativos no momento</p>
          </div>

          <div className="flex items-center mt-auto justify-between w-full gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/happy-hours');
              }}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full backdrop-blur-md transition-all duration-200 active:scale-95 border-none text-white cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            >
              <div className="flex -space-x-2">
                <img className="w-6 h-6 rounded-full border border-[#EF2A39]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" alt="Friend 1" />
                <img className="w-6 h-6 rounded-full border border-[#EF2A39]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" alt="Friend 2" />
                <img className="w-6 h-6 rounded-full border border-[#EF2A39]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" alt="Friend 3" />
              </div>
              <span className="text-xs font-semibold">Entrar</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/happy-hours?create=true');
              }}
              className="flex items-center gap-1.5 bg-white text-[#EF2A39] hover:bg-slate-50 px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 font-semibold text-xs border-none shadow-[0_4px_12px_rgba(239,42,57,0.15)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3.5]" />
              <span>Novo Rolê</span>
            </button>
          </div>
        </div>

        {/* Card Atalho: Amigos */}
        <div
          onClick={() => navigate('/friends')}
          className="rounded-[24px] p-4 flex flex-col justify-between items-start transition-all duration-200 cursor-pointer h-[84px] active:scale-95 bg-white text-[#3C2F2F] shadow-[0_4px_16px_rgba(0,0,0,0.09)] border border-slate-100/60 hover:shadow-[0_6px_20px_rgba(0,0,0,0.14)] hover:-translate-y-0.5"
        >
          <div className="p-2 rounded-xl bg-[#EF2A39]/10 text-[#EF2A39]">
            <Users className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h4 className="font-bold text-xs leading-none">Amigos</h4>
        </div>

        {/* Card Categoria: Favoritos ou Meu Perfil */}
        {isRestaurantOwner ? (
          <div
            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
            className="rounded-[24px] p-4 flex flex-col justify-between items-start transition-all duration-200 cursor-pointer h-[84px] active:scale-95 bg-white text-[#3C2F2F] shadow-[0_4px_16px_rgba(0,0,0,0.09)] border border-slate-100/60 hover:shadow-[0_6px_20px_rgba(0,0,0,0.14)] hover:-translate-y-0.5"
          >
            <div className="p-2 rounded-xl bg-[#EF2A39]/10 text-[#EF2A39]">
              <Eye className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-xs leading-none">Meu Perfil</h4>
          </div>
        ) : (
          <div
            onClick={() => setSelectedCategory('favorites')}
            className={`rounded-[24px] p-4 flex flex-col justify-between items-start transition-all duration-200 cursor-pointer h-[84px] active:scale-95 ${
              selectedCategory === 'favorites'
                ? 'bg-[#EF2A39] text-white shadow-[0_10px_24px_rgba(239,42,57,0.38)]'
                : 'bg-white text-[#3C2F2F] shadow-[0_4px_16px_rgba(0,0,0,0.09)] border border-slate-100/60 hover:shadow-[0_6px_20px_rgba(0,0,0,0.14)] hover:-translate-y-0.5'
            }`}
          >
            <div className={`p-2 rounded-xl ${selectedCategory === 'favorites' ? 'bg-white/20 text-white' : 'bg-[#EF2A39]/10 text-[#EF2A39]'}`}>
              <Heart className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-xs leading-none">Favoritos</h4>
          </div>
        )}
      </div>

      {/* Sessão Recomendados (Destaques dos Restaurantes) */}
      <div className="mb-8 pl-5">
        <div className="flex justify-between items-center pr-5 mb-4">
          <h2 className="font-['Poppins'] font-bold text-[18px] text-[#3C2F2F] flex items-center gap-1.5">
            Recomendados <span className="inline-block w-2 h-2 rounded-full bg-[#EF2A39] animate-pulse" />
          </h2>
          <span className="text-[11px] font-bold text-[#EF2A39] bg-[#EF2A39]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Destaques
          </span>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pr-5 pb-2">
            {recommendedPosts.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => setActiveStoryIndex(idx)}
                className="inline-block w-[150px] h-[220px] rounded-[24px] overflow-hidden relative shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-slate-100 cursor-pointer active:scale-[0.97] transition-all duration-200 group"
              >
                {/* Media */}
                {post.type === 'video' ? (
                  <video
                    src={post.mediaUrl}
                    className="w-full h-full object-cover pointer-events-none"
                    loop
                    muted
                    autoPlay
                    playsInline
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                {/* Top header with restaurant name & logo */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center gap-1.5 z-10 max-w-full">
                  <div className="w-6 h-6 rounded-full border border-white/60 p-[1px] bg-white overflow-hidden shrink-0">
                    <img
                      src={post.restaurantLogo}
                      alt={post.restaurantName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
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

      {/* Categorias — estilo círculo com foto + label */}
      <div className="mb-8 pl-5">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-5 pr-5 pb-2 pt-1">
            {[
              { id: 'all', label: 'Tudo', icon: ChefPlatterIllustration },
              { id: 'combos', label: 'Combos', icon: ComboIllustration },
              { id: 'lanches', label: 'Lanches', icon: BurgerIllustration },
              { id: 'sobremesas', label: 'Sobremesas', icon: CupcakeIllustration },
              { id: 'pizza', label: 'Pizza', icon: PizzaIllustration },
              { id: 'saudavel', label: 'Saudável', icon: SaladIllustration },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150"
                >
                  {/* Círculo com ilustração vetorial */}
                  <div
                    className={`w-[68px] h-[68px] rounded-full p-[2px] transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#FF7E40] to-[#EF2A39] shadow-[0_6px_18px_rgba(239,42,57,0.40)]'
                        : 'bg-transparent shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    }`}
                  >
                    <div className={`w-full h-full rounded-full flex items-center justify-center transition-colors duration-200 ${
                      isSelected ? 'bg-white' : 'bg-white border border-slate-100/80'
                    }`}>
                      <IconComponent className="w-11 h-11" />
                    </div>
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[12px] font-semibold leading-none transition-colors duration-200 ${
                      isSelected ? 'text-[#EF2A39]' : 'text-[#6A6A6A]'
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

      {/* Barra de Macro-Regiões */}
      <div className="px-5 mb-8 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-5 px-5">
          {MACRO_REGIONS.map((region) => {
            const isActive = selectedRegion === region.id;
            return (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5",
                  isActive
                    ? "bg-[#EF2A39] text-white shadow-[0_6px_16px_rgba(239,42,57,0.3)] scale-[1.03]"
                    : "bg-[#F3F4F6] text-[#374151] border border-slate-200/60 hover:bg-slate-200/70"
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
      <div id="tour-restaurants-list" className="px-5 flex flex-col gap-4 pb-32">
        {isRestaurantsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-slate-100/50 p-4 flex gap-4 overflow-hidden items-center">
                {/* Shimmer animado — área da imagem */}
                <div className="relative w-[84px] h-[84px] rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-100"
                    style={{ animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }}
                  />
                </div>
                {/* Shimmer — detalhes */}
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
                className="flex items-center gap-4 p-4 rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-slate-100/50 cursor-pointer hover:shadow-[0_10px_28px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Imagem do Restaurante */}
                <div className="w-[84px] h-[84px] rounded-2xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                  <img 
                    src={getBustedUrl(restaurant.image_url) || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop'} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
                    }}
                  />
                </div>

                {/* Conteúdo */}
                <div className="flex-grow min-w-0 pr-2 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#EF2A39]">
                      {restaurant.category || 'Geral'}
                    </span>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide",
                      isOpen 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    )}>
                      {isOpen ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#3C2F2F] truncate leading-tight">
                    {restaurant.name}
                  </h3>
                  
                  <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-500 font-semibold">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#FF9633] text-[#FF9633]" />
                      <span className="text-[#3C2F2F] font-bold">{mockRating}</span>
                    </div>
                    <span>•</span>
                    <span className="text-slate-400 font-medium">a {restaurant.distance_km?.toFixed(1) || '1.2'} km</span>
                  </div>
                </div>

                {/* Favorito */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(restaurant.id, isFavorite(restaurant.id));
                  }}
                  className={`shrink-0 transition-colors p-1 ${
                    isFavorite(restaurant.id) 
                      ? 'text-[#EF2A39] hover:text-[#EF2A39]/80' 
                      : 'text-[#3C2F2F] hover:text-[#EF2A39]'
                  }`}
                >
                  <Heart className={`w-6 h-6 stroke-[2] ${isFavorite(restaurant.id) ? 'fill-[#EF2A39]' : ''}`} />
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
      {activeStoryIndex !== null && (
        <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[60] bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md">
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
              className="w-full bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white font-bold h-12 rounded-[18px] flex items-center justify-center gap-2 active:scale-98 transition-transform border-none cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Restaurante e Cardápio
            </Button>
          </div>
        </div>
      )}

      {showTour && <FeatureTour onClose={() => setShowTour(false)} />}
    </div>
  );
};

export default Home;