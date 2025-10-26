import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, Menu, Heart, Share2, ChevronRight } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { createPageUrl, PageUrl } from '@/utils/url';
import { formatSchedule } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';
import { WeekSchedule } from '@/types/schedule';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente auxiliar para um item de informação (Localização, Horário, Telefone)
const InfoItem: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode, isLink?: boolean, linkHref?: string }> = ({ icon: Icon, label, value, isLink, linkHref }) => {
  const content = (
    <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
      <Icon className="w-5 h-5 flex-shrink-0 mt-1 text-highlight" />
      <div className="flex flex-col text-base flex-1">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-snug">{label}</p>
        {typeof value === 'string' ? (
          <p className="text-gray-900 dark:text-white font-semibold leading-snug mt-0.5">{value}</p>
        ) : (
          <div className="text-gray-900 dark:text-white font-semibold leading-snug mt-0.5">{value}</div>
        )}
      </div>
    </div>
  );

  if (isLink && linkHref) {
    return (
      <a href={linkHref} className="hover:text-highlight transition-colors">
        {content}
      </a>
    );
  }
  return content;
};

// Componente auxiliar para um item de Ação/Recurso (Cardápio)
const ActionItem: React.FC<{ icon: React.ElementType, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <Card 
    className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none cursor-pointer hover:shadow-lg transition-shadow"
    onClick={onClick}
  >
    <div className="p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-highlight/10 rounded-full flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-highlight" />
        </div>
        <span className="text-lg font-bold text-primary dark:text-white">
          {label}
        </span>
      </div>
      <ChevronRight className="w-6 h-6 text-gray-500" />
    </div>
  </Card>
);


export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  const formattedSchedule = formatSchedule(restaurant.opening_hours as unknown as WeekSchedule | null | undefined);
  
  const [followersCount, setFollowersCount] = useState(120); 
  const [isFavorite, setIsFavorite] = useState(false);
  
  const handleFollowToggle = () => {
    setFollowersCount(prev => prev + 1);
    alert("Seguindo restaurante! (Mock)");
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(prev => !prev);
    alert(isFavorite ? "Removido dos favoritos! (Mock)" : "Adicionado aos favoritos! (Mock)");
  };

  const handleShare = () => {
    alert("Compartilhar restaurante! (Mock)");
  };

  const handleNavigate = (route: PageUrl) => {
    navigate(createPageUrl(route, { restaurantId: restaurant.id }));
  };
  
  const fullAddress = restaurant.address && restaurant.number 
    ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}, ${restaurant.cep}`
    : `${restaurant.address || restaurant.city || 'Endereço não informado'}`;


  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-gray-900">
      
      <main className="max-w-md mx-auto pb-16 relative z-10">
        
        {/* Capa */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {restaurant.cover_image_url && (
            <img 
              src={restaurant.cover_image_url} 
              alt={`Capa de ${restaurant.name}`} 
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Botões de Ação no Topo da Capa */}
          <div className="absolute top-4 right-4 flex space-x-2 z-30">
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full w-10 h-10 bg-white/80 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900 backdrop-blur-sm"
              onClick={handleFavoriteToggle}
            >
              <Heart className={cn("w-5 h-5", isFavorite ? "fill-red-500 text-red-500" : "text-gray-600 dark:text-gray-300")} />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="rounded-full w-10 h-10 bg-white/80 hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900 backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Button>
          </div>

          {/* Logo do Restaurante (Posicionada abaixo da capa) */}
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 z-20">
            <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-900 shadow-lg">
              <AvatarImage src={restaurant.image_url || DEFAULT_RESTAURANT_LOGO_URL} alt={restaurant.name} />
              <AvatarFallback>{restaurant.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 pt-16 space-y-6">
          
          {/* Nome e Categoria */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{restaurant.name}</h1>
            {restaurant.category && (
              <p className="text-base font-medium text-highlight dark:text-highlight-light">{restaurant.category}</p>
            )}
          </div>
          
          {/* Contagem de Seguidores */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
              {followersCount.toLocaleString('pt-BR')} Seguidores
            </p>
          </div>

          {/* Botão Seguir */}
          <Button 
            onClick={handleFollowToggle}
            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg"
          >
            Seguir Restaurante
          </Button>

          {/* Informações Essenciais (Agrupadas em Card com divisores) */}
          <Card className="shadow-md border-none rounded-xl bg-white dark:bg-gray-800">
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              
              {/* Localização */}
              <div className="p-4">
                <InfoItem 
                  icon={MapPin} 
                  label="Localização"
                  value={fullAddress}
                />
              </div>
              
              {/* Horário */}
              <div className="p-4">
                <InfoItem 
                  icon={Clock} 
                  label="Horário"
                  value={
                    <>
                      <span className={cn("font-bold", formattedSchedule.status.includes('Aberto') ? 'text-green-600' : 'text-red-600')}>
                        {formattedSchedule.status.split('.')[0]}
                      </span>
                      {formattedSchedule.nextOpenTime && (
                        <span className="block text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                          {formattedSchedule.nextOpenTime}
                        </span>
                      )}
                    </>
                  }
                />
              </div>

              {/* Telefone */}
              {restaurant.phone && (
                <div className="p-4">
                  <InfoItem 
                    icon={Phone} 
                    label="Telefone"
                    value={restaurant.phone}
                    isLink
                    linkHref={`tel:${restaurant.phone.replace(/\D/g, '')}`}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Cardápio Completo (Card de Ação Proeminente) */}
          <ActionItem
            icon={Menu}
            label="Cardápio Completo"
            onClick={() => handleNavigate('restaurantMenu')}
          />
          
        </div>
      </main>
    </div>
  );
}