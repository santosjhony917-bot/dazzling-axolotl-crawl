import React, { useMemo, useState } from 'react';
import { PublicRestaurantData, GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail, Image, Info } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import RestaurantActionsBar from './RestaurantActionsBar';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import RestaurantInfo from './RestaurantInfo';
import RestaurantMainInfoCard from './RestaurantMainInfoCard';
import AdditionalInfo from './AdditionalInfo';
import { PublicMenuItem } from '@/types/menu';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating, isCompact = false }) => {
  console.log("PremiumProfileLayout: Renderizando com restaurante:", restaurant.name); // Adicionado para depuração
  const navigate = useNavigate();
  const { user } = useAuthData(); 
  const [activeTab, setActiveTab] = useState<'menu' | 'gallery' | 'info'>('menu');

  const fullAddress = useMemo(() => {
    const { address, number, neighborhood, city, state } = restaurant;
    const addressLine = [address, number].filter(Boolean).join(', ');
    const cityLine = [neighborhood, city, state].filter(Boolean).join(', ');
    const result = [addressLine, cityLine].filter(Boolean).join(' - ');
    return result === '' ? null : result;
  }, [restaurant]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Confira o perfil de ${restaurant.name}!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };
  
  // Função para rolar para a seção
  const scrollToSection = (id: string, tab: 'menu' | 'gallery' | 'info') => {
    setActiveTab(tab);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // Dados do Header (agora apenas para a capa)
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    coverImageUrl: restaurant.cover_image_url || '',
    isPremium: true,
    isCompact: isCompact,
  };
  
  const openStatus = getRestaurantOpenStatus(restaurant.opening_hours);

  // Dados para o novo RestaurantMainInfoCard
  const mainInfoCardData = {
    id: restaurant.id,
    name: restaurant.name,
    logoUrl: restaurant.image_url || null,
    addressSummary: restaurant.addressSummary,
    followersCount: restaurant.followers_count,
    isFavorite: restaurant.is_favorite,
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    nextOpenTime: openStatus.nextOpenTime,
    plan: restaurant.plan,
    menu_categories: [
      {
        id: "mock-premium-category-1",
        restaurant_id: restaurant.id,
        name: "Entradas",
        order_index: 0,
        is_active: true,
        is_popular: true,
        created_at: new Date().toISOString(),
        menu_items: [
          {
            id: "mock-premium-item-1",
            category_id: "mock-premium-category-1",
            name: "Bruschetta de Tomate e Manjericão",
            description: "Pão italiano tostado com tomate fresco, manjericão e azeite extra virgem.",
            price: 28.00,
            image_url: "https://via.placeholder.com/150/E47948/FFFFFF?text=Bruschetta",
            order_index: 0,
            is_active: true,
            is_favorite: false,
            created_at: new Date().toISOString(),
          } as PublicMenuItem,
          {
            id: "mock-premium-item-2",
            category_id: "mock-premium-category-1",
            name: "Carpaccio de Salmão",
            description: "Finas fatias de salmão fresco com molho de alcaparras e dill.",
            price: 45.00,
            image_url: "https://via.placeholder.com/150/E47948/FFFFFF?text=Salmão",
            order_index: 1,
            is_active: true,
            is_favorite: false,
            created_at: new Date().toISOString(),
          } as PublicMenuItem,
        ],
      },
      {
        id: "mock-premium-category-2",
        restaurant_id: restaurant.id,
        name: "Pratos Principais",
        order_index: 1,
        is_active: true,
        is_popular: false,
        created_at: new Date().toISOString(),
        menu_items: [
          {
            id: "mock-premium-item-3",
            category_id: "mock-premium-category-2",
            name: "Risoto de Funghi Porcini",
            description: "Arroz arbóreo cremoso com cogumelos funghi porcini e parmesão.",
            price: 72.00,
            image_url: "https://via.placeholder.com/150/E47948/FFFFFF?text=Risoto",
            order_index: 0,
            is_active: true,
            is_favorite: false,
            created_at: new Date().toISOString(),
          } as PublicMenuItem,
          {
            id: "mock-premium-item-4",
            category_id: "mock-premium-category-2",
            name: "Filé Mignon ao Molho Poivre",
            description: "Medalhões de filé mignon grelhados com molho de pimenta verde e batatas rústicas.",
            price: 98.00,
            image_url: "https://via.placeholder.com/150/E47948/FFFFFF?text=Filé",
            order_index: 1,
            is_active: true,
            is_favorite: false,
            created_at: new Date().toISOString(),
          } as PublicMenuItem,
        ],
      },
    ],
    gallery_images: [
      { id: "mock-gallery-1", restaurant_id: restaurant.id, created_at: new Date().toISOString(), image_url: "https://via.placeholder.com/300/E47948/FFFFFF?text=Ambiente+1", caption: "Ambiente Acolhedor", order_index: 0 },
      { id: "mock-gallery-2", restaurant_id: restaurant.id, created_at: new Date().toISOString(), image_url: "https://via.placeholder.com/300/E47948/FFFFFF?text=Prato+Destaque", caption: "Prato Destaque", order_index: 1 },
      { id: "mock-gallery-3", restaurant_id: restaurant.id, created_at: new Date().toISOString(), image_url: "https://via.placeholder.com/300/E47948/FFFFFF?text=Fachada", caption: "Nossa Fachada", order_index: 2 },
    ] as GalleryImage[],
  };

  // Verifica se há conteúdo para as abas
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasGallery = restaurant.gallery_images && restaurant.gallery_images.length > 0;
  
  // Verifica se há informações de endereço/horário ou contato/links
  const hasAddressHours = fullAddress || restaurant.opening_hours;
  const hasContactLinks = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url;
  
  // A aba 'info' agora é exibida se houver qualquer uma das subseções
  const hasInfo = hasAddressHours || hasContactLinks || (restaurant.payment_methods && restaurant.payment_methods.length > 0);

  const containerPxClass = isCompact ? "px-3" : "px-4";

  return (
    <div className="relative">
      
      {/* 2. Container principal que centraliza e define a largura do conteúdo */}
      <div className="relative max-w-md mx-auto">
        {/* Barra de Ações Flutuante (Sticky) - AGORA DENTRO DO CONTAINER */}
        <RestaurantActionsBar
          isFavorite={restaurant.is_favorite}
          onFavoriteToggle={toggleFavorite}
          isFavoriteMutating={isFavoriteMutating}
          onShare={handleShare}
          onBack={() => navigate(-1)}
          paddingClass={containerPxClass}
        />

        {/* NOVO: Componente de capa (agora renderizado aqui) */}
        <RestaurantProfileHeader 
          restaurant={{ 
            id: restaurant.id, 
            name: restaurant.name, 
            coverImageUrl: restaurant.cover_image_url, 
            isPremium: true,
            isCompact: isCompact,
          }} 
        />

        {/* Card de Informações Principais (com logo sobreposta) */}
        {/* Ajustado o -mt para puxar o card mais para cima e sobrepor a capa */}
        <div className="relative -mt-32 z-20 px-4"> {/* Ajustado de -mt-24 para -mt-32 para maior sobreposição */}
          <RestaurantMainInfoCard
            restaurant={mainInfoCardData}
            onFavoriteToggle={toggleFavorite}
            isFavoriteMutating={isFavoriteMutating}
            isCompact={isCompact}
          />
        </div>

        <div className={cn("pb-8", containerPxClass, "pt-16")}> {/* Mantém o padding superior para empurrar o conteúdo para baixo */}
          {/* Conteúdo Principal */}
          <div className="space-y-6">
            
            {/* Description */}
            {restaurant.description && (
              <Card className="p-4 shadow-soft-md rounded-xl bg-white border-none">
                <h2 className="text-2xl font-extrabold text-primary mb-3">Sobre</h2>
                <p className="text-gray-600">{restaurant.description}</p>
              </Card>
            )}
            
            {/* Canais de Pedido */}
            <OrderChannelsSection restaurant={restaurant} />

            {/* Navegação por Abas (Sticky) */}
            {(hasMenu || hasGallery || hasInfo) && (
              <div className="sticky top-0 z-10 bg-background-light pt-4 pb-2 border-b border-gray-200 shadow-sm -mx-4 px-4 mt-6">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex space-x-4">
                    {hasGallery && (
                      <Button
                        variant="ghost"
                        onClick={() => scrollToSection('gallery-section', 'gallery')}
                        className={cn(
                          "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                          activeTab === 'gallery' ? "bg-highlight text-white hover:bg-highlight/90" : "text-primary hover:bg-gray-200"
                        )}
                      >
                        <Image className="w-4 h-4 mr-2" /> Fotos
                      </Button>
                    )}
                    {hasMenu && (
                      <Button
                        variant="ghost"
                        onClick={() => scrollToSection('menu-section', 'menu')}
                        className={cn(
                          "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                          activeTab === 'menu' ? "bg-highlight text-white hover:bg-highlight/90" : "text-primary hover:bg-gray-200"
                        )}
                      >
                        <Utensils className="w-4 h-4 mr-2" /> Cardápio
                      </Button>
                    )}
                    {hasInfo && (
                      <Button
                        variant="ghost"
                        onClick={() => scrollToSection('info-section', 'info')}
                        className={cn(
                          "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                          activeTab === 'info' ? "bg-highlight text-white hover:bg-highlight/90" : "text-primary hover:bg-gray-200"
                        )}
                      >
                        <Info className="w-4 h-4 mr-2" /> Informações
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Galeria Section */}
            {hasGallery && (
              <div id="gallery-section" className="pb-6">
                <RestaurantGallery gallery={restaurant.gallery_images} />
              </div>
            )}

            {/* Menu Section */}
            {hasMenu && (
              <div id="menu-section" className="pt-6">
                <h2 className="text-2xl font-extrabold text-primary mb-4">Cardápio</h2>
                <RestaurantMenu 
                  menuCategories={restaurant.menu_categories} 
                  isFullMenuPage={false}
                  restaurantId={restaurant.id}
                  forceShowFullMenuButton={isCompact}
                />
              </div>
            )}
            
            {/* Informações Detalhadas (Endereço, Horário, Contato) */}
            {hasInfo && (
              <div id="info-section" className="space-y-6 pt-6">
                <h2 className="text-2xl font-extrabold text-primary">Informações</h2>
                
                {/* Endereço, Horário e Formas de Pagamento (Componente Unificado) */}
                {(hasAddressHours || (restaurant.payment_methods && restaurant.payment_methods.length > 0)) && (
                  <RestaurantAddressHoursSection
                    id="address-hours-section"
                    restaurant={restaurant}
                    fullAddress={fullAddress}
                    paymentMethods={restaurant.payment_methods}
                  />
                )}
                
                {/* Contato e Links (Componente Refatorado) */}
                {hasContactLinks && (
                  <RestaurantInfo 
                    id="contact-links-section"
                    restaurant={restaurant}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;