import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ExternalLink, Globe, Heart, MessageSquare, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RestaurantCoverImage from '@/components/public/RestaurantCoverImage';
import RestaurantGallery from '@/components/public/RestaurantGallery';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { OpeningHoursDisplay } from '@/components/public/OpeningHoursDisplay';
import { useRestaurantFavorite } from '@/hooks/useRestaurantFavorite';
import { Separator } from '@/components/ui/separator';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, isLoading: isMutating } = useRestaurantFavorite(restaurant.id);

  const socialLinks = [
    { label: 'WhatsApp', url: restaurant.whatsapp_url, icon: MessageSquare },
    { label: 'iFood', url: restaurant.ifood_url, icon: Utensils },
    { label: 'Site Próprio', url: restaurant.other_url || restaurant.external_url, icon: Globe },
  ].filter(link => link.url);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="relative">
        <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />
        
        {/* Botão de Favorito no topo da capa */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full shadow-lg z-20"
          onClick={toggleFavorite}
          disabled={isMutating}
        >
          <Heart className={`h-6 w-6 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        {/* Seção de Perfil e Informações Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Principal (Logo, Nome, Descrição, Menu, Galeria) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Card de Informações Principais */}
            <Card className="p-6 shadow-xl rounded-2xl bg-white dark:bg-gray-800">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                
                {/* Logo */}
                <div className="w-24 h-24 flex-shrink-0 rounded-full overflow-hidden border-4 border-white dark:border-gray-900 shadow-lg">
                  <img 
                    src={restaurant.image_url || "https://via.placeholder.com/150?text=Premium"} 
                    alt={`Logo de ${restaurant.name}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Nome e Status */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-extrabold text-primary">{restaurant.name}</h1>
                    <Check className="w-4 h-4 text-green-600 fill-green-600" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{restaurant.category}</p>
                  
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-600">{restaurant.followers_count.toLocaleString()} seguidores</p>
                    <span className="text-xs font-bold text-highlight flex items-center">
                      <Heart className="w-3 h-3 mr-1 text-red-500 fill-red-500" /> {isFavorite ? 'Favoritado' : 'Adicionar aos Favoritos'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Descrição */}
            {restaurant.description && (
              <Card className="shadow-soft-md border-none rounded-xl p-4">
                <CardContent className="p-0 text-gray-700 dark:text-gray-300">
                  {restaurant.description}
                </CardContent>
              </Card>
            )}

            {/* Menu */}
            <RestaurantMenu
              id="menu"
              restaurantId={restaurant.id}
              isPremium={true}
              menuCategories={restaurant.menu_categories || []}
            />

          </div>

          {/* Coluna Lateral (Links, Horários, Galeria) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Links Sociais */}
            {socialLinks.length > 0 && (
              <Card className="p-4 shadow-soft-md rounded-xl">
                <p className="text-sm font-semibold text-gray-700 mb-2">Links Rápidos</p>
                <div className="space-y-2">
                  {socialLinks.map((link) => (
                    <a 
                      key={link.label} 
                      href={link.url!} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-800 dark:text-gray-200"
                    >
                      <link.icon className="w-4 h-4 mr-3 text-primary" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Galeria */}
            <RestaurantGallery
              id="gallery"
              restaurantId={restaurant.id}
              plan={restaurant.plan}
              galleryImages={restaurant.gallery_images || []}
            />

            {/* Informações de Contato e Horário */}
            <Card className="p-4 shadow-soft-md rounded-xl">
              <p className="text-sm font-semibold text-gray-700 mb-2">Localização e Contato</p>
              
              {/* Endereço */}
              {restaurant.addressSummary && (
                <div className="flex items-start text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <Globe className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-primary" />
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.addressSummary)}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center"
                  >
                    {restaurant.addressSummary}
                    <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Horário de Funcionamento */}
              <Separator className="my-3" />
              <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
              {restaurant.opening_hours ? (
                <OpeningHoursDisplay openingHours={restaurant.opening_hours as any} />
              ) : (
                <p className="text-sm text-gray-500">Horário não informado.</p>
              )}
            </Card>
          </div>
        </div>
        <div className="h-12"></div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;