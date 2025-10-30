import React, { useMemo } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Utensils, Globe, MapPin, Clock, Heart, Share2, Phone, Mail } from 'lucide-react';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { formatAddressSummary } from '@/lib/utils';
import { formatOpeningHours } from '@/lib/schedule';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrderChannelsSection from './OrderChannelsSection'; // Importando OrderChannelsSection
import DetailedHoursDisplay from './DetailedHoursDisplay'; // Importando DetailedHoursDisplay

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const { user } = useAuth(); 
  const { toggleFavorite, isToggling } = useFavoriteToggle(restaurant.id, restaurant.is_favorite);

  const socialLinks = useMemo(() => {
    const links = [];
    if (restaurant.whatsapp_url) {
      links.push({ url: restaurant.whatsapp_url, icon: MessageSquare, label: 'WhatsApp', type: 'whatsapp' });
    }
    if (restaurant.ifood_url) {
      links.push({ url: restaurant.ifood_url, icon: Utensils, label: 'iFood', type: 'ifood' });
    }
    if (restaurant.other_url) {
      links.push({ url: restaurant.other_url, icon: Utensils, label: 'Anotaaí', type: 'other' });
    }
    return links;
  }, [restaurant]);

  const formattedHours = useMemo(() => {
    if (!restaurant.opening_hours) return 'Horário não definido';
    return formatOpeningHours(restaurant.opening_hours);
  }, [restaurant.opening_hours]);

  const addressSummary = useMemo(() => {
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
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  // Helper function to render icons with specific colors
  const renderIcon = (IconComponent: React.ElementType, type: string) => {
    if (type === 'whatsapp') {
      return <IconComponent className="h-6 w-6 text-green-600" />;
    }
    // Default for other links (Anotaaí/Other Link)
    return <IconComponent className="h-6 w-6 text-primary" />;
  };

  // Helper component for the stylized link button (New Design)
  const OrderLinkButton: React.FC<{ link: typeof socialLinks[0] }> = ({ link }) => {
    const Icon = link.icon;
    
    const isIfood = link.type === 'ifood';
    
    return (
      <a 
        href={link.url} 
        target="_blank" 
        rel="noopener noreferrer"
        // Estilização para corresponder à imagem: botões grandes, arredondados, fundo claro
        className="flex flex-col items-center justify-center p-3 w-full h-24 bg-gray-50 border border-gray-200 rounded-xl shadow-soft-sm hover:shadow-soft-md transition-shadow duration-200 text-center"
      >
        <div className="h-8 flex items-center justify-center">
          {isIfood ? (
            // Simulação do logo iFood: negrito, itálico, cor vermelha
            <span className="text-2xl font-extrabold text-[#EA1D2C] italic leading-none">iFood</span>
          ) : (
            renderIcon(Icon, link.type)
          )}
        </div>
        <span className="mt-1 text-sm font-medium text-gray-700 leading-tight">
          {link.label}
        </span>
      </a>
    );
  };


  return (
    <div className="min-h-screen bg-background-light">
      {/* Cover Image and Header Section */}
      <div className="relative h-48 md:h-64 bg-gray-300 overflow-hidden shadow-soft-md">
        {restaurant.cover_image_url && (
          <img
            src={restaurant.cover_image_url}
            alt={`Capa de ${restaurant.name}`}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 -mt-16 pb-8">
        {/* Profile Card and Actions (Header) */}
        <Card className="p-6 shadow-soft-xl rounded-2xl bg-white relative">
          <div className="flex items-end justify-between">
            {/* Logo and Name */}
            <div className="flex items-end">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white border-4 border-white rounded-full shadow-lg -mt-12 md:-mt-16 flex items-center justify-center overflow-hidden flex-shrink-0">
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={`Logo de ${restaurant.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Utensils className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="ml-4 pb-2 min-w-0">
                <h1 className="text-2xl md:text-3xl font-extrabold text-primary leading-tight truncate">
                  {restaurant.name}
                </h1>
                <p className="text-sm text-gray-500">{restaurant.category}</p>
              </div>
            </div>

            {/* Actions (Favorite/Share) */}
            <div className="flex space-x-2 pb-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => toggleFavorite()}
                disabled={!user || isToggling}
                className="rounded-full bg-white hover:bg-gray-50 shadow-soft-sm border-gray-200"
              >
                <Heart 
                  className={cn(`h-5 w-5 transition-colors`, restaurant.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-500')} 
                />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleShare}
                className="rounded-full bg-white hover:bg-gray-50 shadow-soft-sm border-gray-200"
              >
                <Share2 className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {restaurant.description && (
            <p className="mt-4 text-gray-600">{restaurant.description}</p>
          )}

          {/* Separator removido daqui, pois as informações de contato foram movidas para o final */}
        </Card>

        {/* Main Content Area - NOVA ORDEM */}
        <div className="mt-6 space-y-6">
          
          {/* 1. Canais de Pedido */}
          <OrderChannelsSection restaurant={restaurant} />

          {/* 2. Galeria Section */}
          {restaurant.gallery_images && restaurant.gallery_images.length > 0 && (
            <RestaurantGallery gallery={restaurant.gallery_images} />
          )}

          {/* 3. Menu Section */}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
            <RestaurantMenu menuCategories={restaurant.menu_categories} />
          )}
          
          {/* 4. Informações Detalhadas (Endereço, Horário, Contato) */}
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold text-primary">Informações</h2>
            
            {/* Endereço */}
            {addressSummary && (
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-highlight mt-1 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-primary">Endereço</p>
                  <p className="text-sm text-gray-600">{addressSummary}</p>
                </div>
              </div>
            )}
            
            {/* Horário Detalhado */}
            {restaurant.opening_hours && (
              <DetailedHoursDisplay schedule={restaurant.opening_hours} />
            )}
            
            {/* Contato (Telefone/Email) */}
            {(restaurant.phone || restaurant.email) && (
              <div className="space-y-2 pt-2">
                <p className="text-base font-semibold text-primary">Contato</p>
                {restaurant.phone && (
                  <a href={`tel:${restaurant.phone}`} className="flex items-center space-x-3 text-gray-700 hover:text-highlight transition-colors">
                    <Phone className="h-5 w-5 text-highlight" />
                    <span>{restaurant.phone}</span>
                  </a>
                )}
                {restaurant.email && (
                  <a href={`mailto:${restaurant.email}`} className="flex items-center space-x-3 text-gray-700 hover:text-highlight transition-colors">
                    <Mail className="h-5 w-5 text-highlight" />
                    <span>{restaurant.email}</span>
                  </a>
                )}
              </div>
            )}
            
            {/* Formas de Pagamento (Mocked, pois não temos os dados no DB) */}
            <div className="space-y-2 pt-2">
                <p className="text-base font-semibold text-primary">Formas de Pagamento</p>
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">PIX</span>
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Crédito</span>
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Débito</span>
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Dinheiro</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;