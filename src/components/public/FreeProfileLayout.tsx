import React, { useMemo, useState } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail, Image, Info } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatAddressSummary } from '@/lib/utils';
import { getRestaurantOpenStatus } from '@/lib/schedule'; // Importando a função de status
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantInfo from './RestaurantInfo';
import RestaurantPaymentSection from './RestaurantPaymentSection';
import { Info } from 'lucide-react'; // Importar Info
import RestaurantActionsBar from './RestaurantActionsBar'; // CORRIGIDO: Importando o componente renomeado
import RestaurantProfileHeader from './RestaurantProfileHeader'; // NOVO: Componente principal
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import RestaurantInfo from './RestaurantInfo';
import RestaurantPaymentSection from './RestaurantPaymentSection';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu' | 'gallery' | 'info'>('menu');

  const fullAddress = useMemo(() => {
    return formatAddressSummary(
      restaurant.address,
      restaurant.number,
      restaurant.neighborhood,
      restaurant.city,
      restaurant.state
    );
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
  
  // Dados do Header
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    logoUrl: restaurant.logoUrl || '',
    coverImageUrl: restaurant.cover_image_url || '',
    addressSummary: restaurant.addressSummary,
    followersCount: restaurant.followers_count,
    isFavorite: restaurant.is_favorite,
    isOpen: restaurant.isOpen,
    statusText: restaurant.statusText,
    isPremium: false,
  };
  
  // Verifica se há conteúdo para as abas
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasGallery = restaurant.gallery_images && restaurant.gallery_images.length > 0;
  
  // Verifica se há informações de endereço/horário ou contato/links
  const hasAddressHours = fullAddress || restaurant.opening_hours;
  const hasContactLinks = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url || (restaurant.social_networks && restaurant.social_networks.length > 0);
  const hasPaymentMethods = restaurant.payment_methods && restaurant.payment_methods.length > 0;

  const hasInfo = hasAddressHours || hasContactLinks || hasPaymentMethods; // Definindo hasInfo

  return (
    <div className="min-h-screen bg-background-light">
      
      {/* 1. Barra de Ações Flutuante (Sticky) */}
      <RestaurantActionsBar
        isFavorite={restaurant.is_favorite}
        onFavoriteToggle={toggleFavorite}
        isFavoriteMutating={isFavoriteMutating}
        onShare={handleShare}
        onBack={() => navigate(-1)}
      />

      {/* 2. Cabeçalho Principal (Capa, Logo, Info) */}
      <RestaurantProfileHeader
        restaurant={headerData}
        onFavoriteToggle={toggleFavorite}
        isFavoriteMutating={isFavoriteMutating}
      />

      <div className="container mx-auto px-4 pb-8">
        {/* Conteúdo Principal */}
        <div className="mt-6 space-y-6">
          
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
            <div className="sticky top-0 z-10 bg-background-light pt-4 pb-2 border-b border-gray-200 shadow-sm -mx-4 px-4">
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
          
          {/* 2. Galeria Section */}
          {hasGallery && (
            <div id="gallery-section">
              <RestaurantGallery gallery={restaurant.gallery_images} />
            </div>
          )}
          
          {/* 3. Menu Section */}
          {hasMenu && (
            <div id="menu-section">
              <RestaurantMenu 
                menuCategories={restaurant.menu_categories} 
                isFullMenuPage={false}
                restaurantId={restaurant.id}
              />
            </div>
          )}
          
          {/* 4. Informações Detalhadas (Endereço, Horário, Contato) */}
          {hasInfo && (
            <div id="info-section" className="space-y-6">
              <h2 className="text-2xl font-extrabold text-primary">Informações</h2>
              
              {/* Endereço e Horário (Novo Componente) */}
              {hasAddressHours && (
                <RestaurantAddressHoursSection
                  id="address-hours-section"
                  restaurant={restaurant}
                  fullAddress={fullAddress}
                />
              )}
              
              {/* Contato e Links (Componente Refatorado) */}
              {hasContactLinks && (
                <RestaurantInfo 
                  id="contact-links-section"
                  restaurant={restaurant}
                />
              )}
              
              {/* Formas de Pagamento (Novo Componente) */}
              {hasPaymentMethods && <RestaurantPaymentSection id="payment-section" restaurant={restaurant} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;