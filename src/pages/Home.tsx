import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Star, Heart, Users, Sparkles, Plus, Eye, MapPin, ChevronDown } from 'lucide-react';
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
import UserLocationModal from '@/components/restaurant/UserLocationModal';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { restaurant } = useAuthData();
  const isRestaurantOwner = !!restaurant;
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Parsear amigavelmente o endereço para exibição compacta (ex: Bairro)
  const locationDisplayName = useMemo(() => {
    if (!location.address) return 'Definir endereço';
    if (location.address === "Av. Cabo Branco, 2000 - Cabo Branco, João Pessoa - PB") {
      return "Cabo Branco";
    }
    const parts = location.address.split('-');
    if (parts.length >= 2) {
      const midPart = parts[1].trim();
      const subParts = midPart.split(',');
      if (subParts.length >= 1) {
        return subParts[0].trim();
      }
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

  // Filtragem local dos restaurantes baseado na categoria selecionada
  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (selectedCategory === 'all') return restaurants;
    if (selectedCategory === 'nearby') {
      return [...restaurants].sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    }
    if (selectedCategory === 'favorites') {
      return restaurants.filter(r => isFavorite(r.id));
    }
    if (selectedCategory === 'combos') {
      return restaurants.filter(r =>
        r.category?.toLowerCase().includes('combo') ||
        r.name?.toLowerCase().includes('combo')
      );
    }
    if (selectedCategory === 'lanches') {
      return restaurants.filter(r =>
        r.category?.toLowerCase().includes('lanche') ||
        r.category?.toLowerCase().includes('hambúrg') ||
        r.category?.toLowerCase().includes('burg')
      );
    }
    if (selectedCategory === 'sobremesas') {
      return restaurants.filter(r =>
        r.category?.toLowerCase().includes('sobremesa') ||
        r.category?.toLowerCase().includes('doce') ||
        r.category?.toLowerCase().includes('sorvete') ||
        r.category?.toLowerCase().includes('açaí') ||
        r.category?.toLowerCase().includes('acai')
      );
    }
    return restaurants;
  }, [restaurants, selectedCategory, isFavorite]);

  return (
    <div className="bg-white w-full flex-grow pt-8 font-['Poppins']">

      {/* Cabeçalho */}
      <div className="px-5 mb-6 flex justify-between items-start">
        <div className="flex flex-col min-w-0 pr-2">
          <h1 className="font-['Lobster'] text-[45px] text-[#3C2F2F] leading-tight">
            FilterFood
          </h1>
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
      <div className="px-5 mb-8 flex gap-4">
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

          <div className="flex items-center mt-auto gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2.5">
                <img className="w-7 h-7 rounded-full border-2 border-[#EF2A39]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" alt="Friend 1" />
                <img className="w-7 h-7 rounded-full border-2 border-[#EF2A39]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" alt="Friend 2" />
                <img className="w-7 h-7 rounded-full border-2 border-[#EF2A39]" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" alt="Friend 3" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/friends?tab=search');
                }}
                className="w-7 h-7 rounded-full border-2 border-[#EF2A39] bg-white flex items-center justify-center text-[#EF2A39] hover:bg-slate-50 transition-transform active:scale-90 z-10 shadow-[0_2px_5px_rgba(0,0,0,0.04)]"
                title="Adicionar Amigos"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3.5]" />
              </button>
            </div>
            <span className="text-xs font-semibold bg-white/25 px-3 py-1 rounded-full backdrop-blur-md ml-auto">Entrar</span>
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

      {/* Categorias — estilo círculo com foto + label */}
      <div className="mb-10 pl-5">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-5 pr-5 pb-2 pt-1">
            {[
              {
                id: 'all',
                label: 'Tudo',
                img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=120&fit=crop&crop=center',
              },
              {
                id: 'combos',
                label: 'Combos',
                img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=120&h=120&fit=crop&crop=center',
              },
              {
                id: 'lanches',
                label: 'Lanches',
                img: 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=120&h=120&fit=crop&crop=center',
              },
              {
                id: 'sobremesas',
                label: 'Sobremesas',
                img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=120&h=120&fit=crop&crop=center',
              },
              {
                id: 'pizza',
                label: 'Pizza',
                img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop&crop=center',
              },
              {
                id: 'saudavel',
                label: 'Saudável',
                img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=120&h=120&fit=crop&crop=center',
              },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-2 active:scale-95 transition-transform duration-150"
                >
                  {/* Círculo com foto */}
                  <div
                    className={`w-[68px] h-[68px] rounded-full p-[3px] transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#FF7E40] to-[#EF2A39] shadow-[0_6px_18px_rgba(239,42,57,0.40)]'
                        : 'bg-[#E8EAED] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    }`}
                  >
                    <img
                      src={cat.img}
                      alt={cat.label}
                      className="w-full h-full rounded-full object-cover"
                    />
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

      {/* Lista de Restaurantes (Cards Horizontais) */}
      <div className="px-5 flex flex-col gap-4 pb-8">
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

            return (
              <div 
                key={restaurant.id} 
                onClick={() => navigate(createPageUrl('restaurant', restaurant.id))}
                className="flex items-center gap-4 p-4 rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-slate-100/50 cursor-pointer hover:shadow-[0_10px_28px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Imagem do Restaurante */}
                <div className="w-[84px] h-[84px] rounded-2xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                  <img 
                    src={restaurant.logo_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop'} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop';
                    }}
                  />
                </div>

                {/* Conteúdo */}
                <div className="flex-grow min-w-0 pr-2 flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#EF2A39] mb-0.5">
                    {restaurant.category || 'Geral'}
                  </span>
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
    </div>
  );
};

export default Home;