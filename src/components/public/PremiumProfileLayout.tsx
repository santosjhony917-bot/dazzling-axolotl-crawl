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
      // Usamos Utensils como placeholder, mas o OrderLinkButton renderizará o logo simulado
      links.push({ url: restaurant.ifood_url, icon: Utensils, label: 'iFood', type: 'ifood' });
    }
    if (restaurant.other_url) {
      // Assumindo 'Anotaaí' como o rótulo para 'other_url' baseado na imagem
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
    return <IconComponent className="h-6 w-6 text-[#022D68]" />;
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
        className="flex flex-col items-center justify-center p-3 w-full h-24 bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 text-center"
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
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image and Header Section */}
      <div className="relative h-48 md:h-64 bg-gray-300 overflow-hidden">
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
        {/* Profile Card and Actions */}
        <Card className="p-6 shadow-lg rounded-xl bg-white relative">
          <div className="flex items-end justify-between">
            {/* Logo and Name */}
            <div className="flex items-end">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white border-4 border-white rounded-full shadow-md -mt-12 md:-mt-16 flex items-center justify-center overflow-hidden">
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
              <div className="ml-4 pb-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#022D68] leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-sm text-gray-500">{restaurant.category}</p>
              </div>
            </div>

            {/* Actions (Favorite/Share) */}
            <div className="flex space-x-2 pb-2">
              <Button 
                variant="outline" 
                size="icon" 
                // CORREÇÃO 8: Chamando a função sem argumentos
                onClick={() => toggleFavorite()} 
                disabled={!user || isToggling} 
                className="rounded-full bg-white hover:bg-gray-50"
              >
                <Heart 
                  className={`h-5 w-5 transition-colors ${restaurant.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
                />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleShare}
                className="rounded-full bg-white hover:bg-gray-50"
              >
                <Share2 className="h-5 w-5 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {restaurant.description && (
            <p className="mt-4 text-gray-600">{restaurant.description}</p>
          )}

          <Separator className="my-4" />

          {/* Contact and Location Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
            {addressSummary && ( 
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-[#022D68]" />
                <p>{addressSummary}</p>
              </div>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center space-x-2 hover:text-[#022D68] transition-colors">
                <Phone className="h-4 w-4 text-[#022D68]" />
                <p>{restaurant.phone}</p>
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center space-x-2 hover:text-[#022D68] transition-colors">
                <Mail className="h-4 w-4 text-[#022D68]" />
                <p>{restaurant.email}</p>
              </a>
            )}
            {restaurant.opening_hours && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-[#022D68]" />
                <p>{formattedHours}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content Area */}
        <div className="mt-6 space-y-6">
          
          {/* Order Links Section (Redesigned) */}
          {socialLinks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-[#022D68]">Faça seu pedido</h2>
              <div className="grid grid-cols-3 gap-4">
                {socialLinks.map((link, index) => (
                  <OrderLinkButton key={index} link={link} />
                ))}
              </div>
            </div>
          )}

          {/* Gallery Section */}
          {restaurant.gallery_images && restaurant.gallery_images.length > 0 && (
            <RestaurantGallery gallery={restaurant.gallery_images} />
          )}

          {/* Menu Section */}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
            <RestaurantMenu menuCategories={restaurant.menu_categories} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;