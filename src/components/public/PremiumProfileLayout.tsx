import React, { useState, useMemo } from 'react';
import { MapPin, Clock, Utensils, MessageSquare, ShoppingCart, Globe, Heart, Crown, Share2, Check, CreditCard, DollarSign, Zap, Camera, Package, Star, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatPrice } from '@/lib/utils';
import { Restaurant, MenuItem, MenuCategoryWithItems } from '@/types/supabase';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import AdditionalInfo from './AdditionalInfo';
import { WeekSchedule } from '@/types/schedule';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showInfo } from '@/utils/toast';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import FullMenuDisplay from '@/components/FullMenuDisplay';
import { usePublicGallery, PublicGalleryImage } from '@/hooks/usePublicGallery';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay'; // Importando o novo componente

interface PremiumProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente de Card de Item de Menu com Favorito
const PremiumMenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { isItemFavorite, toggleItemFavorite, isLoading: isMutating } = useMenuItemFavorites();
  const isFavorite = isItemFavorite(item.id);
  const { user } = useAuthContext();
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showInfo("Faça login para favoritar pratos!");
      return;
    }
    toggleItemFavorite({ itemId: item.id, isCurrentlyFavorite: isFavorite });
  };

  return (
    <div className="flex gap-4 p-4 border-b last:border-b-0 dark:border-gray-700 relative">
      <div className="flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
        )}
        <p className="text-base font-bold text-highlight dark:text-highlight-light mt-2">
          {formatPrice(item.price)}
        </p>
      </div>
      {item.image_url && (
        <img 
          src={item.image_url} 
          alt={item.name} 
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 shadow-soft-sm"
        />
      )}
      
      {/* Botão de Favoritar Item */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleFavorite}
        disabled={isMutating}
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm shadow-soft-sm"
      >
        <Heart 
          className={cn(
            "w-4 h-4 transition-colors",
            isFavorite ? "text-red-500 fill-red-500" : "text-gray-500 hover:text-red-500"
          )}
        />
      </Button>
    </div>
  );
};

// Componente de Menu Completo
const PremiumFullMenuDisplay: React.FC<{ menu: MenuCategoryWithItems[], loading: boolean }> = ({ menu, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!menu || menu.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Nenhum item de menu encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {menu.map((category) => (
        <section key={category.id} className="scroll-mt-20" id={`category-${category.id}`}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10 border-b dark:border-gray-700">
            {category.name}
          </h2>
          <Card className={cn(
            "bg-white dark:bg-gray-800 shadow-soft-lg",
            category.items.length > 0 ? "divide-y divide-gray-100 dark:divide-gray-700" : ""
          )}>
            {category.items.length > 0 ? (
              category.items.map((item) => (
                <PremiumMenuItemCard key={item.id} item={item} />
              ))
            ) : (
              <p className="p-4 text-gray-500 dark:text-gray-400 italic">Nenhum item nesta categoria.</p>
            )}
          </Card>
        </section>
      ))}
    </div>
  );
};


// Mock Payment Methods
const mockPaymentMethods = [
  { icon: Zap, label: 'PIX' },
  { icon: CreditCard, label: 'Crédito' },
  { icon: CreditCard, label: 'Débito' },
  { icon: DollarSign, label: 'Dinheiro' },
];

// Componente de Canais de Pedido
const OrderChannels: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  const typedRestaurant = restaurant as unknown as { whatsapp_url: string | null, ifood_url: string | null, other_url: string | null } & Restaurant;
  
  const channels = useMemo(() => [
    { icon: MessageSquare, label: "WhatsApp", url: typedRestaurant.whatsapp_url },
    { icon: ShoppingCart, label: "iFood", url: typedRestaurant.ifood_url },
    { icon: Globe, label: "Outro Link", url: typedRestaurant.other_url },
  ].filter(c => c.url), [typedRestaurant]);

  if (channels.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-primary mb-4">Peça agora pelo seu canal favorito</h2>
      <div className="grid grid-cols-3 gap-4">
        {channels.map((channel, index) => {
          const Icon = channel.icon;
          return (
            <a 
              key={index} 
              href={channel.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-soft-md border border-gray-200 cursor-pointer hover:shadow-soft-lg transition-shadow"
            >
              <Icon className="w-7 h-7 text-highlight" />
              <p className="text-xs font-semibold text-gray-700">{channel.label}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
};

// Componente principal do layout Premium
const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [followersCount, setFollowersCount] = useState(1200); // Mock para Premium
  
  const { menu, menuLoading } = useRestaurantMenu(restaurant.id);
  const { gallery, isLoading: galleryLoading } = usePublicGallery(restaurant.id);
  
  const handleFollowToggle = () => {
    setFollowersCount(prev => prev + (1)); // Simulação
    alert("Seguindo restaurante! (Mock)");
  };
  
  // NOVO: Formatação do endereço para o cabeçalho
  const addressSummary = useMemo(() => {
    const parts = [restaurant.address, restaurant.neighborhood, restaurant.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [restaurant.address, restaurant.neighborhood, restaurant.city]);

  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: followersCount,
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    onFollowToggle: handleFollowToggle,
    addressSummary: addressSummary, // Adicionado para resolver o erro TS2741
  };

  return (
    <div className="relative w-full bg-[#f5f7f8] min-h-screen">
      
      {/* Capa e Header Flutuante */}
      <div className="relative w-full">
        {/* Capa */}
        <div className="relative w-full h-64 bg-gray-300 dark:bg-gray-700">
          {restaurant.cover_image_url ? (
            <img className="w-full h-full object-cover" alt={`Capa de ${restaurant.name}`} src={restaurant.cover_image_url} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">Sem Capa</div>
          )}
          {/* Overlay Degradê Suave */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
        
        {/* Header Flutuante (Logo, Nome, Botões) */}
        <div className="absolute -bottom-16 left-0 right-0 z-10 bg-white dark:bg-gray-800 rounded-t-2xl shadow-soft-xl pt-4">
          <RestaurantPublicHeader restaurant={headerData} />
        </div>
      </div>
      
      {/* Conteúdo Principal (Abaixo do Header Flutuante) */}
      <div className="pt-20 px-4 pb-20 space-y-6">
        
        {/* Botão Seguir */}
        <Button 
          onClick={handleFollowToggle}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-soft-md"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Seguir Restaurante
        </Button>
        
        {/* Abas de Navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-white shadow-soft-md border-b border-gray-200 dark:border-gray-700 rounded-xl">
            <TabsTrigger value="menu" className="flex flex-col h-auto py-3 px-1 data-[state=active]:border-b-2 data-[state=active]:border-highlight data-[state=active]:text-highlight text-primary font-bold rounded-none">
              Cardápio
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex flex-col h-auto py-3 px-1 data-[state=active]:border-b-2 data-[state=active]:border-highlight data-[state=active]:text-highlight text-primary font-bold rounded-none">
              Fotos
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex flex-col h-auto py-3 px-1 data-[state=active]:border-b-2 data-[state=active]:border-highlight data-[state=active]:text-highlight text-primary font-bold rounded-none">
              Promoções
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex flex-col h-auto py-3 px-1 data-[state=active]:border-b-2 data-[state=active]:border-highlight data-[state=active]:text-highlight text-primary font-bold rounded-none">
              Avaliações
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-6">
            
            {/* Tab: Cardápio */}
            <TabsContent value="menu" className="mt-0">
              <OrderChannels restaurant={restaurant} />
              
              <div className="mt-8">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 p-4 shadow-soft-md">
                  <Crown className="w-7 h-7 text-white fill-white" />
                  <p className="font-bold text-white text-xl drop-shadow-md">Cardápio Premium</p>
                </div>
                
                <div className="mt-4">
                  <PremiumFullMenuDisplay menu={menu} loading={menuLoading} /> 
                </div>
              </div>
            </TabsContent>
            
            {/* Tab: Fotos */}
            <TabsContent value="photos" className="mt-0">
              <PhotoGalleryDisplay 
                gallery={gallery} 
                restaurantName={restaurant.name} 
                isLoading={galleryLoading} 
              />
            </TabsContent>
            
            {/* Tab: Promoções */}
            <TabsContent value="promotions" className="mt-0">
              <Card className="p-6 text-center shadow-soft-md">
                <Zap className="w-8 h-8 text-highlight mx-auto mb-3" />
                <h3 className="text-lg font-bold text-primary">Promoções Exclusivas</h3>
                <p className="text-gray-600 text-sm mt-1">Este restaurante Premium tem acesso a cupons e ofertas especiais.</p>
                <Button className="mt-4 bg-highlight hover:bg-highlight/90 rounded-full shadow-soft-md">Ver Ofertas Ativas</Button>
              </Card>
            </TabsContent>
            
            {/* Tab: Avaliações */}
            <TabsContent value="reviews" className="mt-0">
              <Card className="p-6 text-center shadow-soft-md">
                <Star className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-bold text-primary">Avaliações</h3>
                <p className="text-gray-600 text-sm mt-1">Funcionalidade de avaliações em desenvolvimento.</p>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Informações Adicionais (Sempre visível) */}
        <AdditionalInfo restaurant={restaurant} />
        
        {/* Horários Detalhados (Se houver) */}
        {restaurant.opening_hours && (
          <DetailedHoursDisplay schedule={restaurant.opening_hours as unknown as WeekSchedule} />
        )}
        
        {/* Descrição do Restaurante */}
        {restaurant.description && (
          <Card className="p-4 shadow-soft-md">
            <h3 className="text-lg font-bold text-primary mb-2">Sobre {restaurant.name}</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{restaurant.description}</p>
          </Card>
        )}
        
      </div>
    </div>
  );
};

export default PremiumProfileLayout;