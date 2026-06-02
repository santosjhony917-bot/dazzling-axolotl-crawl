import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils, DollarSign, Compass, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { createPageUrl } from '@/utils/url';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import ActionCard from '@/components/restaurant/dashboard/ActionCard';
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import NearbyCompetitorCard from '@/components/restaurant/dashboard/NearbyCompetitorCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByDistanceModal from '@/components/search/SearchByDistanceModal';
import { motion, AnimatePresence } from 'framer-motion';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const searchKey = 'search';
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = React.useState(false);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [distance, setDistance] = React.useState<number[]>([10]); // Inicializando distance

  const userLat = location.latitude;
  const userLon = location.longitude;

  // Busca restaurantes próximos (habilitada apenas se a localização for conhecida)
  const { 
    data: restaurants, // Corrigido: usar 'data' e renomear para 'restaurants'
    isLoading: isRestaurantsLoading, // Corrigido: usar 'isLoading' e renomear
    error: restaurantsError, 
    refetch: refetchRestaurants 
  } = useNearbyRestaurants({
    userLat,
    userLon,
    enabled: userLat !== null && userLon !== null,
    searchQuery: searchQuery, // Passa a query de busca
    limit: 5, // Limitar a 5 para a seção de prévia na Home
    offset: 0,
  });
  const handleLocationSaved = () => {
    refetchLocation();
    setIsLocationModalOpen(false);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    // Redireciona para a página de busca unificada com a query e tipo de busca
    navigate(createPageUrl(searchKey, undefined, { 
      searchQuery: searchQuery, 
      searchType: 'dish' 
    }));
  };

  const handleSearchByPrice = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de preço.");
      setIsLocationModalOpen(true);
      return;
    }
    setIsPriceModalOpen(true);
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
    // Redireciona para a tela de busca unificada com os filtros aplicados
    showSuccess(`Filtro de preço aplicado: R$${minPrice.toFixed(2)} a R$${maxPrice.toFixed(2)}. Redirecionando para Busca.`);
    navigate(createPageUrl(searchKey, undefined, { 
      minPrice: minPrice.toString(), 
      maxPrice: maxPrice.toString(), 
      searchQuery: searchQuery, // Manter a query de busca atual
      searchType: 'dish' 
    }));
    setIsPriceModalOpen(false); // Fechar o modal após aplicar
  };

  const handleSearchNearby = () => {
    if (userLat === null || userLon === null) {
      showError("Defina sua localização primeiro para usar o filtro de distância.");
      setIsLocationModalOpen(true);
      return;
    }
    setIsDistanceModalOpen(true);
  };
  
  const handleApplyDistanceFilter = (maxDistanceKm: number) => {
    // Redireciona para a tela de busca unificada com os filtros aplicados
    showSuccess(`Filtro de distância aplicado: até ${maxDistanceKm} km. Redirecionando para Busca.`);
    navigate(createPageUrl(searchKey, undefined, { 
      maxDistance: maxDistanceKm.toString(), 
      searchQuery: searchQuery, // Manter a query de busca atual
      searchType: 'restaurant' 
    }));
    setIsDistanceModalOpen(false); // Fechar o modal após aplicar
  };

  return (
    <div className="bg-[#f5f7f8]"> {/* Removido min-h-screen, pb-20, max-w-md, mx-auto */}
      
      {/* Header com Localização Premium */}
      <header className="bg-gradient-to-br from-primary to-[#011b3e] p-5 pb-6 shadow-soft-lg sticky top-0 z-30 rounded-b-[2rem] border-b border-white/5">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setIsLocationModalOpen(true)}
        >
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-inner">
            <MapPin className="h-5 w-5 text-highlight animate-pulse" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/50">Localização de Busca</p>
            {isLocationLoading ? (
              <div className="flex items-center text-sm font-semibold text-white mt-0.5">
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-white" /> Carregando...
              </div>
            ) : (
              <p className="text-base font-extrabold text-white tracking-tight truncate">
                {location.address.split(',')[0] || "Definir Local"}
              </p>
            )}
          </div>
        </div>
        
        {/* Barra de Busca Principal */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2.5 mt-5">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              type="text"
              placeholder="Buscar por prato ou restaurante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 h-12 rounded-2xl border-none bg-white text-primary focus-visible:ring-2 focus-visible:ring-highlight/50 shadow-soft-md placeholder-gray-400 text-sm font-medium"
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            className="h-12 w-12 rounded-2xl shrink-0 bg-highlight hover:bg-highlight/90 text-white shadow-highlight-glow transition-transform active:scale-95 border-none"
          >
            <Search className="w-5 h-5" />
          </Button>
        </form>
      </header>

      <main className="p-4 space-y-6">
        
        {/* Ações Rápidas (Filtros) */}
        <div className="flex gap-4 pt-2">
          <ActionCard 
            title="Buscar Prato|por Preço" 
            icon={DollarSign} 
            onClick={handleSearchByPrice}
          />
          <ActionCard 
            title="Buscar Restaurantes|Próximos" 
            icon={Compass} 
            onClick={handleSearchNearby}
          />
        </div>

        {/* Banner/Card de Happy Hour */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/happy-hours')}
          className="cursor-pointer"
        >
          <div className="relative rounded-3xl h-56 w-full overflow-hidden shadow-lg border border-slate-100 flex items-end p-5">
            {/* Imagem de Fundo */}
            <img 
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80" 
              alt="Happy Hour" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradiente Escuro de Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
            
            {/* Conteúdo do Banner */}
            <div className="relative z-10 flex w-full items-end justify-between gap-4">
              <div className="flex-grow max-w-[70%]">
                <h3 className="text-2xl font-bold font-serif text-white tracking-tight leading-tight">
                  Reúna a Galera:<br />Crie seu Happy Hour!
                </h3>
                <p className="text-white/80 text-xs mt-2 leading-relaxed font-medium">
                  Convide amigos e vote em tempo real no melhor restaurante!
                </p>
              </div>
              
              {/* Botão de Ação Circular no canto inferior direito */}
              <div className="flex flex-col items-center gap-1 shrink-0 mb-1">
                <div className="w-14 h-14 bg-[#FFF0E5] text-[#D87D4A] rounded-full flex items-center justify-center shadow-lg shadow-black/30 hover:scale-105 active:scale-95 transition-transform duration-200">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-[#FFF0E5] uppercase tracking-wider mt-1.5">
                  Criar Agora
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Banner Premium */}
        <PremiumBanner />
        
        {/* Restaurantes Próximos */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold text-primary tracking-tight">Restaurantes Próximos</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto text-sm font-semibold"
              onClick={handleSearchNearby}
            >
              Ver todos
            </Button>
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {isRestaurantsLoading || isLocationLoading ? (
                <motion.div
                  key="restaurants-loading"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <Skeleton className="w-full h-24 rounded-xl" />
                  <Skeleton className="w-full h-24 rounded-xl" />
                </motion.div>
              ) : restaurantsError ? (
                <motion.div
                  key="restaurants-error"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-xl shadow-soft-md"
                >
                  <p className="font-semibold">Erro ao carregar restaurantes:</p>
                  <p>{restaurantsError.message}</p> {/* Corrigido: acessar .message */}
                  <Button onClick={() => refetchRestaurants()} className="mt-4">Tentar Novamente</Button>
                </motion.div>
              ) : restaurants && restaurants.length > 0 ? (
                <motion.div
                  key="restaurants-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="space-y-4"
                >
                  {restaurants.map((restaurant) => (
                    <RestaurantCard 
                      key={restaurant.id} 
                      restaurant={restaurant} 
                      onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="restaurants-empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md"
                >
                  <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
                  <p className="mt-2">Tente ajustar sua localização ou filtros de busca.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* User Location Modal */}
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={handleLocationSaved}
      />
      
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

      {/* Botão Flutuante da IA (FAB) */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/combo-finder')}
        className="fixed bottom-24 right-5 sm:right-[calc(50%-204px)] z-40 bg-gradient-to-br from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white w-14 h-14 rounded-full shadow-lg shadow-indigo-600/40 flex items-center justify-center cursor-pointer border border-white/10"
      >
        <Sparkles className="w-6 h-6 animate-pulse text-white" />
      </motion.button>
    </div>
  );
};

export default Home;