import React, { useState, useMemo } from 'react';
import { MapPin, Clock, Utensils, MessageSquare, ShoppingCart, Globe, Heart, Crown, Share2, Check, CreditCard, DollarSign, Zap, Camera, Package, Star, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatPrice } from '@/lib/utils';
import { Restaurant } from '@/types/supabase';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DetailedHoursDisplay from './DetailedHoursDisplay';
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

interface PremiumProfileLayoutProps {
  restaurant: Restaurant;
}

// Mock Payment Methods
const mockPaymentMethods = [
  { icon: Zap, label: 'PIX' },
  { icon: CreditCard, label: 'Crédito' },
  { icon: CreditCard, label: 'Débito' },
  { icon: DollarSign, label: 'Dinheiro' },
];

// Componente de Galeria de Fotos (Adaptado para usar dados reais)
const PhotoGallerySection: React.FC<{ gallery: PublicGalleryImage[], restaurantName: string, isLoading: boolean }> = ({ gallery, restaurantName, isLoading }) => {
  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  }
  
  if (gallery.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-6 text-center">
        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhuma foto na galeria.</p>
      </Card>
    );
  }
  
  // Exibição simplificada: 1 imagem grande e 2 pequenas
  const largeItem = gallery[0];
  const smallItems = gallery.slice(1, 3);

  return (
    <div className="mt-4">
      <h2 className="text-lg font-bold text-primary mb-4">Sinta o ambiente antes de chegar</h2>
      <div className="grid grid-cols-3 gap-2 h-[320px]">
        {/* Imagem Principal */}
        {largeItem && (
          <div className="col-span-2 row-span-2 relative rounded-xl overflow-hidden">
            <img 
              className="w-full h-full object-cover" 
              alt={largeItem.caption || `Foto de ${restaurantName}`} 
              src={largeItem.image_url} 
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white font-bold text-lg">
              {gallery.length > 1 ? `+${gallery.length - 1} fotos` : ''}
            </div>
          </div>
        )}
        
        {/* Imagens Pequenas */}
        {smallItems.map((item, index) => (
          <div key={index} className="col-span-1 h-[156px] relative rounded-xl overflow-hidden">
            <img 
              className="w-full h-full object-cover" 
              alt={item.caption || `Foto ${index + 2}`} 
              src={item.image_url} 
            />
            <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full">
              <p className="text-white text-sm font-semibold drop-shadow-md truncate">{item.caption || 'Foto'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de Canais de Pedido
const OrderChannels: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  const channels = useMemo(() => [
    { icon: MessageSquare, label: "WhatsApp", url: restaurant.whatsapp_url },
    { icon: ShoppingCart, label: "iFood", url: restaurant.ifood_url },
    { icon: Globe, label: "Outro Link", url: restaurant.other_url },
  ].filter(c => c.url), [restaurant]);

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
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
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

// Componente de Informações Adicionais
const AdditionalInfo: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  const address = restaurant.address && restaurant.number ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}` : null;
  
  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-bold text-primary">Informações</h2>
      
      {/* Endereço */}
      {address && (
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary pt-1 shrink-0" />
          <p className="text-sm text-gray-700">{address}</p>
        </div>
      )}
      
      {/* Horário */}
      {restaurant.opening_hours && (
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary pt-1 shrink-0" />
          <p className="text-sm text-gray-700">
            Horário de Funcionamento: <span className="font-semibold text-green-600">Aberto agora</span>
          </p>
        </div>
      )}
      
      {/* Pagamento */}
      <div className="flex items-start gap-3">
        <CreditCard className="w-5 h-5 text-primary pt-1 shrink-0" />
        <div>
          <p className="text-sm font-bold text-primary">Formas de Pagamento</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {mockPaymentMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div key={index} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-gray-700">{method.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal do layout Premium
const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [followersCount, setFollowersCount] = useState(1200); // Mock para Premium
  
  // CORREÇÃO: useRestaurantMenu não recebe argumentos e usa menuLoading
  const { menu, menuLoading, fetchMenu } = useRestaurantMenu();
  
  // CORREÇÃO: usePublicGallery recebe o ID
  const { gallery, isLoading: galleryLoading } = usePublicGallery(restaurant.id);
  
  // CORREÇÃO: Chamar fetchMenu com o ID do restaurante
  React.useEffect(() => {
    if (restaurant.id) {
      fetchMenu(restaurant.id);
    }
  }, [restaurant.id, fetchMenu]);
  
  const handleFollowToggle = () => {
    setFollowersCount(prev => prev + (1)); // Simulação
    alert("Seguindo restaurante! (Mock)");
  };
  
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: followersCount,
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    onFollowToggle: handleFollowToggle,
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
        
        {/* Header Flutuante (Logo, Nome, Botões) */}
        <div className="absolute -bottom-16 left-0 right-0 z-10 bg-white dark:bg-gray-800 rounded-t-3xl shadow-xl pt-4">
          <RestaurantPublicHeader restaurant={headerData} />
        </div>
      </div>
      
      {/* Conteúdo Principal (Abaixo do Header Flutuante) */}
      <div className="pt-20 px-4 pb-20 space-y-6">
        
        {/* Botão Seguir (Abaixo do Header Público) */}
        <Button 
          onClick={handleFollowToggle}
          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Seguir Restaurante
        </Button>
        
        {/* Abas de Navegação */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-0 bg-white shadow-none border-b border-gray-200 dark:border-gray-700 rounded-none">
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
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 p-4 shadow-lg">
                  <Crown className="w-7 h-7 text-white fill-white" />
                  <p className="font-bold text-white text-xl drop-shadow-md">Cardápio Premium</p>
                </div>
                
                <div className="mt-4">
                  <FullMenuDisplay menu={menu} /> 
                </div>
              </div>
            </TabsContent>
            
            {/* Tab: Fotos */}
            <TabsContent value="photos" className="mt-0">
              <PhotoGallerySection 
                gallery={gallery} 
                restaurantName={restaurant.name} 
                isLoading={galleryLoading} 
              />
            </TabsContent>
            
            {/* Tab: Promoções */}
            <TabsContent value="promotions" className="mt-0">
              <Card className="p-6 text-center">
                <Zap className="w-8 h-8 text-highlight mx-auto mb-3" />
                <h3 className="text-lg font-bold text-primary">Promoções Exclusivas</h3>
                <p className="text-gray-600 text-sm mt-1">Este restaurante Premium tem acesso a cupons e ofertas especiais.</p>
                <Button className="mt-4 bg-highlight hover:bg-highlight/90 rounded-full">Ver Ofertas Ativas</Button>
              </Card>
            </TabsContent>
            
            {/* Tab: Avaliações */}
            <TabsContent value="reviews" className="mt-0">
              <Card className="p-6 text-center">
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
          <DetailedHoursDisplay schedule={restaurant.opening_hours as WeekSchedule} />
        )}
        
        {/* Descrição do Restaurante */}
        {restaurant.description && (
          <Card className="p-4">
            <h3 className="text-lg font-bold text-primary mb-2">Sobre {restaurant.name}</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{restaurant.description}</p>
          </Card>
        )}
        
      </div>
    </div>
  );
};

export default PremiumProfileLayout;