import React from 'react';
import { Restaurant } from '@/types/supabase';
import { PublicRestaurantData } from '@/types/restaurant';
import { Crown, Check, Heart, Share2, MapPin, Clock, Utensils, MessageSquare, Globe, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatPrice } from '@/lib/utils';
import RestaurantCoverImage from './RestaurantCoverImage';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader';
import RestaurantMenuSection from './RestaurantMenuSection';
import RestaurantGallerySection from './RestaurantGallerySection';
import { Separator } from '@/components/ui/separator';
import { OpeningHoursDisplay } from './OpeningHoursDisplay';
import { useRestaurantFavorite } from '@/hooks/useRestaurantFavorite';

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const { isFavorite, toggleFavorite, isLoading: isMutating } = useRestaurantFavorite(restaurant.id);
  
  // Helper para links
  const socialLinks = [
    { label: 'WhatsApp', url: restaurant.whatsapp_url, icon: MessageSquare },
    { label: 'iFood', url: restaurant.ifood_url, icon: Utensils },
    { label: 'Site Próprio', url: restaurant.other_url || restaurant.external_url, icon: Globe },
  ].filter(link => link.url);

  // Helper para status de abertura (simplificado)
  const isOpen = true; // Mocked for now

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-20 shadow-lg">
      
      {/* Imagem de Capa */}
      <div className="relative">
        <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />
        
        {/* Botões de Ação no Topo (Premium Style) */}
        <div className="absolute top-4 right-4 z-20 flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            disabled={isMutating}
            className="rounded-full h-10 w-10 shadow-soft-md bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
          >
            <Heart 
              className={cn(
                "w-5 h-5 transition-colors",
                isFavorite ? "text-red-500 fill-red-500" : "text-white hover:text-red-500"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-10 w-10 shadow-soft-md bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copiado!');
            }}
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="relative -mt-16 px-4 sm:px-6 lg:px-8">
        
        {/* Card de Informações Centrais (Flutuante) */}
        <Card className="flex flex-col items-center justify-start rounded-2xl bg-white shadow-soft-xl p-4 pt-0">
          <div className="relative -mt-10 mb-2">
            {/* Logo com Borda Premium */}
            <div className="w-24 h-24 rounded-full border-4 border-highlight bg-gray-200 shadow-lg overflow-hidden">
              <img 
                src={restaurant.image_url || "https://via.placeholder.com/150?text=Premium"} 
                alt={`Logo de ${restaurant.name}`} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <div className="flex w-full flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-primary">{restaurant.name}</h1>
              <Check className="w-4 h-4 text-green-600 fill-green-600" /> 
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">{restaurant.followersCount.toLocaleString()} seguidores</p>
              <span className="text-xs font-bold text-highlight flex items-center">
                <Crown className="w-3 h-3 mr-1 fill-highlight" /> PREMIUM
              </span>
            </div>
          </div>
          
          {/* Ações de Contato Rápido */}
          <div className="flex w-full gap-3 justify-center mt-4 pt-4 border-t border-gray-100">
            <Button className="flex-1 rounded-xl h-10 px-3 bg-primary text-white text-sm font-bold">Seguir</Button>
            <Button variant="outline" className="flex-1 rounded-xl h-10 px-3 border border-primary text-primary text-sm font-bold">Contatos</Button>
          </div>
        </Card>
        
        {/* Conteúdo Principal */}
        <div className="mt-8 space-y-8">
          
          {/* Descrição */}
          {restaurant.description && (
            <Card className="shadow-soft-md border-none rounded-xl p-4">
              <CardContent className="p-0 text-gray-700 dark:text-gray-300">
                {restaurant.description}
              </CardContent>
            </Card>
          )}
          
          {/* Canais de Pedido (Links Sociais) */}
          {socialLinks.length > 0 && (
            <Card className="shadow-soft-md border-none rounded-xl p-4">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-lg font-bold text-primary">Peça agora</CardTitle>
              </CardHeader>
              <CardContent className="p-0 grid grid-cols-3 gap-3">
                {socialLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <a 
                      key={index} 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 rounded-lg bg-highlight/10 p-3 shadow-soft-sm border border-highlight/20 hover:bg-highlight/20 transition-colors"
                    >
                      <Icon className="w-6 h-6 text-highlight" />
                      <p className="text-xs font-semibold text-primary">{link.label}</p>
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Galeria de Fotos (Premium) */}
          <RestaurantGallerySection 
            id="gallery"
            restaurantId={restaurant.id}
            isPremium={true}
          />
          
          {/* Cardápio (Premium) */}
          <RestaurantMenuSection 
            id="menu"
            restaurantId={restaurant.id}
            isPremium={true}
          />
          
          {/* Informações Detalhadas (Endereço e Horários) */}
          <Card className="shadow-soft-md border-none rounded-xl p-4">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-bold text-primary">Informações Detalhadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              
              {/* Endereço */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700">Localização</p>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.addressSummary)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-base text-gray-900 hover:text-highlight transition-colors break-words flex items-center"
                  >
                    {restaurant.addressSummary}
                    <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />
                  </a>
                </div>
              </div>
              
              {/* Horários */}
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
                  {restaurant.opening_hours ? (
                    <OpeningHoursDisplay openingHours={restaurant.opening_hours as any} />
                  ) : (
                    <p className="text-gray-500">Horário não definido.</p>
                  )}
                </div>
              </div>
              
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PremiumProfileLayout;