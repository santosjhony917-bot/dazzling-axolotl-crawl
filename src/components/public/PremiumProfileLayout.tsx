import React, { useMemo, useState } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Utensils, MapPin, Heart, Share2, Image, Info, Loader2 } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantActionsBar from './RestaurantActionsBar';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import RestaurantInfo from './RestaurantInfo';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact?: boolean;
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
  
  const scrollToSection = (id: string, tab: 'menu' | 'gallery' | 'info') => {
    setActiveTab(tab);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    coverImageUrl: restaurant.cover_image_url || '',
    isPremium: true,
    isCompact: isCompact,
  };

  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasGallery = restaurant.gallery_images && restaurant.gallery_images.length > 0;
  const hasAddressHours = fullAddress || restaurant.opening_hours;
  const hasContactLinks = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url;
  const hasInfo = hasAddressHours || hasContactLinks || (restaurant.payment_methods && restaurant.payment_methods.length > 0);

  const containerPxClass = isCompact ? "px-3" : "px-4";
  const logoSizeClasses = isCompact ? "w-20 h-20 -top-10" : "w-28 h-28 -top-14";
  const utensilsSizeClasses = isCompact ? "w-10 h-10" : "w-12 h-12";

  return (
    <div className="min-h-screen bg-background-light">
      
      {/* 1. Container para Capa e Ações */}
      <div className="relative">
        <RestaurantProfileHeader restaurant={headerData} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/30 to-black/40" aria-hidden="true" />
        <div className="absolute top-0 left-0 right-0 z-10 pt-4">
          <div className="max-w-md mx-auto">
            <RestaurantActionsBar
              isFavorite={restaurant.is_favorite}
              onFavoriteToggle={toggleFavorite}
              isFavoriteMutating={isFavoriteMutating}
              onShare={handleShare}
              onBack={() => navigate(-1)}
              paddingClass={containerPxClass}
            />
          </div>
        </div>
      </div>
      
      {/* 2. Container principal para o conteúdo */}
      <div className={cn("relative max-w-md mx-auto z-20", containerPxClass)}>
        
        {/* Logo sobreposta */}
        <div className="relative h-14">
          {restaurant.plan !== 'free' && restaurant.image_url ? (
            <img
              src={restaurant.image_url || DEFAULT_RESTAURANT_LOGO_URL}
              alt={`Logo de ${restaurant.name}`}
              className={cn(
                "rounded-full border-4 border-white shadow-lg object-cover absolute left-1/2 -translate-x-1/2 z-30",
                logoSizeClasses
              )}
            />
          ) : (
            <div className={cn(
              "rounded-full border-4 border-white bg-gray-200 flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-30",
              logoSizeClasses
            )}>
              <Utensils className={cn("text-gray-400", utensilsSizeClasses)} />
            </div>
          )}
        </div>

        {/* Informações Principais (SEM CARD) */}
        <div className="text-center">
          <h1 className={cn(
            "font-extrabold leading-tight text-primary",
            isCompact ? "text-2xl" : "text-3xl md:text-4xl"
          )}>{restaurant.name}</h1>
          
          <div className="mt-2 flex flex-col items-center gap-2">
            {restaurant.addressSummary && (
              <p className={cn(
                "flex items-center text-gray-600",
                isCompact ? "text-xs" : "text-sm md:text-base"
              )}>
                <MapPin className={cn("mr-1 text-primary", isCompact ? "w-3 h-3" : "w-4 h-4")} /> {restaurant.addressSummary}
              </p>
            )}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                restaurant.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}
            >
              {restaurant.statusText}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <span className={cn(
              "flex items-center text-gray-500",
              isCompact ? "text-xs" : "text-sm"
            )}>
              <Heart className={cn("mr-1 fill-gray-700 text-gray-700", isCompact ? "w-3 h-3" : "w-4 h-4")} /> {restaurant.followers_count} Seguidores
            </span>
            <Button
              variant="highlight"
              size="sm"
              onClick={toggleFavorite}
              disabled={isFavoriteMutating}
              className={cn(
                "px-3 py-1",
                isCompact ? "h-7 text-xs" : "h-9 text-sm"
              )}
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                restaurant.is_favorite ? 'Seguindo' : 'Seguir'
              )}
            </Button>
          </div>
        </div>

        {/* Conteúdo Principal em Cards */}
        <div className="mt-6 space-y-6 pb-8">
          {restaurant.description && (
            <Card className="p-4 shadow-soft-md rounded-xl bg-white border-none">
              <h2 className="text-2xl font-extrabold text-primary mb-3">Sobre</h2>
              <p className="text-gray-600">{restaurant.description}</p>
            </Card>
          )}
          
          <OrderChannelsSection restaurant={restaurant} />

          {(hasMenu || hasGallery || hasInfo) && (
            <div className="sticky top-0 z-10 bg-background-light pt-4 pb-2 border-b border-gray-200 shadow-sm -mx-4 px-4">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4">
                  {hasGallery && (
                    <Button variant="ghost" onClick={() => scrollToSection('gallery-section', 'gallery')} className={cn("rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0", activeTab === 'gallery' ? "bg-highlight text-white hover:bg-highlight/90" : "text-primary hover:bg-gray-200")}>
                      <Image className="w-4 h-4 mr-2" /> Fotos
                    </Button>
                  )}
                  {hasMenu && (
                    <Button variant="ghost" onClick={() => scrollToSection('menu-section', 'menu')} className={cn("rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0", activeTab === 'menu' ? "bg-highlight text-white hover:bg-highlight/90" : "text-primary hover:bg-gray-200")}>
                      <Utensils className="w-4 h-4 mr-2" /> Cardápio
                    </Button>
                  )}
                  {hasInfo && (
                    <Button variant="ghost" onClick={() => scrollToSection('info-section', 'info')} className={cn("rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0", activeTab === 'info' ? "bg-highlight text-white hover:bg-highlight/90" : "text-primary hover:bg-gray-200")}>
                      <Info className="w-4 h-4 mr-2" /> Informações
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {hasGallery && (
            <div id="gallery-section">
              <RestaurantGallery gallery={restaurant.gallery_images} />
            </div>
          )}

          {hasMenu && (
            <div id="menu-section">
              <h2 className="text-2xl font-extrabold text-primary mb-4">Cardápio</h2>
              <RestaurantMenu 
                menuCategories={restaurant.menu_categories} 
                isFullMenuPage={false}
                restaurantId={restaurant.id}
                forceShowFullMenuButton={isCompact}
              />
            </div>
          )}
          
          {hasInfo && (
            <div id="info-section" className="space-y-6">
              <h2 className="text-2xl font-extrabold text-primary">Informações</h2>
              {(hasAddressHours || (restaurant.payment_methods && restaurant.payment_methods.length > 0)) && (
                <RestaurantAddressHoursSection
                  id="address-hours-section"
                  restaurant={restaurant}
                  fullAddress={fullAddress}
                  paymentMethods={restaurant.payment_methods}
                />
              )}
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
  );
};

export default PremiumProfileLayout;