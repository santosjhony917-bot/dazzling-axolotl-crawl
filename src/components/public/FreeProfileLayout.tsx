import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, Menu, Utensils, Heart, Share2 } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { createPageUrl, PageUrl } from '@/utils/url';
import { formatSchedule } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader'; // Importando o Header Público
import { WeekSchedule } from '@/types/schedule'; // Importando WeekSchedule

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente auxiliar para um item de informação (Localização, Horário, Telefone)
const InfoItem: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode, isLink?: boolean, linkHref?: string }> = ({ icon: Icon, label, value, isLink, linkHref }) => {
  const content = (
    <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
      <Icon className="w-5 h-5 flex-shrink-0 mt-1 text-highlight" />
      <div className="flex flex-col text-base">
        <p className="text-gray-700 dark:text-gray-300 leading-snug">{label}</p>
        {typeof value === 'string' ? (
          <p className="text-gray-900 dark:text-white font-medium leading-snug">{value}</p>
        ) : (
          value
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

// Componente auxiliar para um item de Ação/Recurso (Simplificado, sem lógica de bloqueio)
const ActionItem: React.FC<{ icon: React.ElementType, label: string, actionText?: string, onClick: () => void }> = ({ icon: Icon, label, actionText, onClick }) => (
  <div 
    className={cn(
      "p-4 flex justify-between items-center font-semibold transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0",
      "text-primary dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
    )}
    onClick={onClick}
  >
    <span className="flex items-center gap-3 text-base">
      <Icon className="w-5 h-5 text-highlight" /> {label}
    </span>
    {actionText && (
      <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">{actionText}</span>
    )}
  </div>
);


export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  // CORREÇÃO 1: Cast opening_hours para WeekSchedule | null | undefined
  const formattedSchedule = formatSchedule(restaurant.opening_hours as WeekSchedule | null | undefined);
  
  // Mock state for followers (usando um valor fixo para o layout Free, mas garantindo que seja passado)
  const [followersCount, setFollowersCount] = useState(120); 
  
  const handleFollowToggle = () => {
    // Mock logic for following
    setFollowersCount(prev => prev + 1);
    alert("Seguindo restaurante! (Mock)");
  };

  const handleNavigate = (route: PageUrl) => {
    navigate(createPageUrl(route, { restaurantId: restaurant.id }));
  };
  
  const fullAddress = restaurant.address && restaurant.number 
    ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}, ${restaurant.cep}`
    : `${restaurant.address || restaurant.city || 'Endereço não informado'}`;

  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: followersCount, // Passando o estado mockado
    logoUrl: restaurant.image_url || DEFAULT_RESTAURANT_LOGO_URL,
    onFollowToggle: handleFollowToggle,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      
      <main className="max-w-md mx-auto pb-16 relative z-10">
        
        {/* Capa (Fundo Cinza) */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {/* Se houver cover_image_url, exibe */}
          {restaurant.cover_image_url && (
            <img 
              src={restaurant.cover_image_url} 
              alt={`Capa de ${restaurant.name}`} 
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Header Público (Logo, Nome, Favoritar, Compartilhar, Seguidores) */}
          <div className="absolute -bottom-10 left-0 right-0 z-20">
            <RestaurantPublicHeader restaurant={headerData} />
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 pt-20 space-y-6">
          
          {/* REMOVIDO: Nome e Categoria duplicados. O header já cuida disso. */}
          {restaurant.category && (
            <p className="text-base font-medium text-highlight dark:text-highlight-light text-center -mt-4 mb-4">{restaurant.category}</p>
          )}

          {/* Botão Seguir (Abaixo do nome/categoria) */}
          <Button 
            onClick={handleFollowToggle}
            className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
          >
            Seguir Restaurante
          </Button>

          {/* Informações Essenciais */}
          <div className="space-y-4">
            
            {/* Localização */}
            <InfoItem 
              icon={MapPin} 
              label="Localização"
              value={fullAddress}
            />
            
            {/* Horário */}
            <InfoItem 
              icon={Clock} 
              label="Horário"
              value={
                <>
                  <span className={cn("font-medium", formattedSchedule.status.includes('Aberto') ? 'text-green-600' : 'text-red-600')}>
                    {formattedSchedule.status.split('.')[0]}
                  </span>
                  {formattedSchedule.nextOpenTime && (
                    <span className="block text-sm text-gray-500 dark:text-gray-400 font-normal">
                      {formattedSchedule.nextOpenTime}
                    </span>
                  )}
                </>
              }
            />

            {/* Telefone */}
            {restaurant.phone && (
              <InfoItem 
                icon={Phone} 
                label="Telefone"
                value={restaurant.phone}
                isLink
                linkHref={`tel:${restaurant.phone.replace(/\D/g, '')}`}
              />
            )}
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Ações e Recursos (Card) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700">
            
            {/* Cardápio Completo (Funcional para Free) */}
            <ActionItem
              icon={Menu}
              label="Cardápio Completo"
              actionText="Ver todos"
              onClick={() => handleNavigate('restaurantMenu')}
            />
            
          </div>
          
        </div>
      </main>
    </div>
  );
}