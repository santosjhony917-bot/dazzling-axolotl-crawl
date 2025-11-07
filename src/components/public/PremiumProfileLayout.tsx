import React, { useMemo, useState } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Utensils, MapPin, Clock, Heart, Share2, Phone, Mail, Image, Info, ArrowLeft } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getRestaurantOpenStatus } from '@/lib/schedule';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import RestaurantActionsBar from './RestaurantActionsBar'; // CORRIGIDO: Importando o componente renomeado
import RestaurantProfileHeader from './RestaurantProfileHeader'; // NOVO: Componente principal
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection'; // NOVO IMPORT
import RestaurantInfo from './RestaurantInfo'; // Componente refatorado para Contato/Links
import RestaurantMainInfoCard from './RestaurantMainInfoCard'; // NOVO IMPORT
import AdditionalInfo from './AdditionalInfo';
import { isRestaurantOpen } from "@/lib/utils";

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void; // NOVO
  isFavoriteMutating: boolean; // NOVO
  isCompact?: boolean; // NOVO: Prop para modo compacto
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating, isCompact = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
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
    coverImageUrl: restaurant.cover_image_url || '', // Adicionado coverImageUrl
    isPremium: true, // CORREÇÃO: Adicionado isPremium
    isCompact: isCompact, // NOVO: Passa a prop isCompact
  };
  
  // Dados para o novo RestaurantMainInfoCard
  const mainInfoCardData = {
    id: restaurant.id,
    name: restaurant.name,
    logoUrl: restaurant.image_url || null,
    addressSummary: restaurant.addressSummary,
    followersCount: restaurant.followers_count,
    isFavorite: restaurant.is_favorite,
    isOpen: restaurant.isOpen,
    statusText: restaurant.statusText,
    plan: restaurant.plan, // Adicionado 'plan'
  };

  // Verifica se há conteúdo para as abas
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasGallery = restaurant.gallery_images && restaurant.gallery_images.length > 0;
  
  // Verifica se há informações de endereço/horário ou contato/links
  const hasAddressHours = fullAddress || restaurant.opening_hours;
  const hasContactLinks = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url;
  
  // A aba 'info' agora é exibida se houver qualquer uma das subseções
  const hasInfo = hasAddressHours || hasContactLinks || (restaurant.payment_methods && restaurant.payment_methods.length > 0); // Lógica atualizada para hasInfo

  const containerPxClass = isCompact ? "px-3" : "px-4"; // Reduz o padding horizontal do container principal

  return (
    <div className="relative">
      
      {/* REMOVIDO: 1. Capa do Restaurante (RestaurantProfileHeader) - Agora é renderizado pelo componente pai */}
      
      {/* 2. Container principal que centraliza e define a largura do conteúdo */}
      <div className="relative max-w-md mx-auto">
        {/* REMOVIDO: Barra de Ações Flutuante (Absolute) - Botões de Voltar e Compartilhar são agora gerenciados por RestaurantPageHeader */}
        {/* <div className="absolute top-4 left-0 right-0 z-10 flex justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-white/50 backdrop-blur-sm rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="bg-white/50 backdrop-blur-sm rounded-full"
          >
            <Share2 className="h-5 w-5 text-gray-800" />
          </Button>
        </div> */}

        {/* Card de Informações Principais (com logo sobreposta) */}
        <RestaurantMainInfoCard
          restaurant={mainInfoCardData}
          onFavoriteToggle={toggleFavorite}
          isFavoriteMutating={isFavoriteMutating}
          isCompact={isCompact} // PASSA A PROP isCompact
        />

        <div className={cn("pb-8", containerPxClass)}> {/* Remove max-w e mx-auto daqui */}
          {/* Conteúdo Principal */}
          <div className="mt-4 space-y-6">
            
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
                  forceShowFullMenuButton={isCompact} // NOVO: Força a exibição do botão no modo compacto
                />
              </div>
            )}
            
            {/* Informações Detalhadas (Endereço, Horário, Contato) */}
            {hasInfo && (
              <div id="info-section" className="space-y-6 pt-6">
                <h2 className="text-2xl font-extrabold text-primary">Informações</h2>
                
                {/* Endereço, Horário e Formas de Pagamento (Componente Unificado) */}
                {(hasAddressHours || (restaurant.payment_methods && restaurant.payment_methods.length > 0)) && ( // Verifica se há endereço/horário OU formas de pagamento
                  <RestaurantAddressHoursSection
                    id="address-hours-section"
                    restaurant={restaurant}
                    fullAddress={fullAddress}
                    paymentMethods={restaurant.payment_methods} // Passa as formas de pagamento
                  />
                )}
                
                {/* Contato e Links (Componente Refatorado) */}
                {hasContactLinks && (
                  <RestaurantInfo 
                    id="contact-links-section"
                    restaurant={restaurant}
                  />
                )}
                
                {/* REMOVIDO: Formas de Pagamento (Componente Antigo) */}
                {/* <RestaurantPaymentSection id="payment-section" restaurant={restaurant} /> */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;