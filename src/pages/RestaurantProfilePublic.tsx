import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Phone, Utensils, Crown, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { usePublicRestaurantProfile } from '@/hooks/usePublicRestaurantProfile';
import PublicRestaurantLayout from '@/components/PublicRestaurantLayout';
import { showError, showSuccess } from '@/utils/toast';
import { formatCurrency } from '@/utils/formatters';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import FullMenuDisplay from '@/components/FullMenuDisplay';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';

// Componente para exibir o conteúdo principal do perfil (usado dentro do layout)
interface RestaurantProfileContentProps {
  restaurant: any;
  menu: any[];
  menuLoading: boolean;
}

const RestaurantProfileContent: React.FC<RestaurantProfileContentProps> = ({ restaurant, menu, menuLoading }) => {
  const navigate = useNavigate();
  const isPremium = restaurant.plan === 'premium';

  // --- Mock de Dados Sociais (Movido para o componente pai para persistência de estado) ---
  // Usando useState para simular a contagem de seguidores
  const [followersCount, setFollowersCount] = useState(120); 
  
  const handleFollowToggle = () => {
    // Simulação de toggle de seguir
    setFollowersCount(prev => prev + (followersCount > 120 ? -1 : 1));
  };
  
  const formatScheduleSummary = (schedule: any): string => {
    if (!schedule) return "Horários não definidos";
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const fullDayKey = Object.keys(schedule).find(key => key === today) as keyof typeof schedule | undefined;

    if (fullDayKey && schedule[fullDayKey]?.isOpen && schedule[fullDayKey].slots.length > 0) {
      const slot = schedule[fullDayKey].slots[0];
      return `Aberto hoje: ${slot.start} - ${slot.end}`;
    }
    return "Fechado hoje";
  };

  const scheduleSummary = formatScheduleSummary(restaurant.opening_hours);

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* 1. Header Social (Substitui Topo e Card Flutuante) */}
      <Card className="w-full max-w-md shadow-xl border-none rounded-b-3xl p-0 bg-white dark:bg-gray-800">
        <RestaurantPublicHeader
          restaurant={{
            id: restaurant.id, // Passando o ID
            name: restaurant.name,
            followersCount: followersCount,
            logoUrl: restaurant.image_url || DEFAULT_RESTAURANT_LOGO_URL,
            onFollowToggle: handleFollowToggle,
          }}
        />
      </Card>
      
      <div className="w-full max-w-md space-y-4 px-4 py-4 pb-24">
        
        {/* 2. Informações Básicas (Localização e Horários) */}
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4 space-y-3">
          <h3 className="text-lg font-bold text-[#022D68] mb-3">Informações</h3>
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <MapPin className="w-5 h-5 text-highlight flex-shrink-0" />
            <p className="text-sm">{restaurant.address || "Endereço não informado"}</p>
          </div>
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Clock className="w-5 h-5 text-highlight flex-shrink-0" />
            <p className="text-sm">{scheduleSummary}</p>
          </div>
          
          {/* Botões de Ação (WhatsApp, iFood, etc.) */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            {restaurant.whatsapp_url && (
              <Button 
                onClick={() => window.open(restaurant.whatsapp_url, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 h-10 px-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-full"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </Button>
            )}
            {restaurant.ifood_url && (
              <Button 
                onClick={() => window.open(restaurant.ifood_url, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 h-10 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-full"
              >
                <ShoppingCart className="w-4 h-4" />
                iFood
              </Button>
            )}
          </div>
        </Card>
        
        {/* 3. Cardápio Completo */}
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4">
          <h2 className="text-xl font-bold text-[#022D68] mb-4">Cardápio</h2>
          {menuLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <FullMenuDisplay menu={menu} loading={menuLoading} />
          )}
        </Card>
        
        {/* 4. Descrição (Se houver) */}
        {restaurant.description && (
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4">
            <h3 className="text-lg font-bold text-[#022D68] mb-2">Sobre Nós</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{restaurant.description}</p>
          </Card>
        )}
      </div>
    </div>
  );
};


const RestaurantProfilePublic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePublicRestaurantProfile(id); 
  const { menu, loading: menuLoading } = useRestaurantMenu(id);

  if (isLoading) {
    return (
      <PublicRestaurantLayout restaurant={null} backPath="home">
        <div className="p-4 space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </PublicRestaurantLayout>
    );
  }

  if (error || !data || !data.restaurant) {
    return (
      <PublicRestaurantLayout restaurant={null} backPath="home">
        <div className="p-8 text-center text-red-500">
          <p className="font-bold">Erro ao carregar o perfil do restaurante.</p>
          <p className="text-sm text-gray-700 mt-2">Detalhe: {error || "Restaurante não encontrado."}</p>
          <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
        </div>
      </PublicRestaurantLayout>
    );
  }

  const { restaurant } = data;

  return (
    <PublicRestaurantLayout restaurant={restaurant} backPath="home">
      <RestaurantProfileContent restaurant={restaurant} menu={menu} menuLoading={menuLoading} />
    </PublicRestaurantLayout>
  );
};

export default RestaurantProfilePublic;