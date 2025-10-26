import React, { useMemo } from 'react';
import { Restaurant } from '@/types';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { useFollowerCount } from '@/hooks/useFollowerCount';
import { useFavorites } from '@/hooks/useFavorites';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import MenuSection from './MenuSection';
import AdditionalInfo from './AdditionalInfo';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import { WeekSchedule } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Utensils, Heart, Loader2 } from 'lucide-react';
import { formatSchedule } from '@/utils/schedule';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { useAuthContext } from '@/context/AuthContext';
import { showError } from '@/utils/toast';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  
  // Hooks de Dados
  const { followerCount, isLoading: isFollowerLoading, refetch: refetchFollowers } = useFollowerCount(restaurant.id);
  const { isFavorite, toggleFavorite, isLoading: isFavoriteLoading } = useFavorites(restaurant.id);
  const { menu, menuLoading } = useRestaurantMenu(restaurant.id);

  const isLoading = isFollowerLoading || isFavoriteLoading || menuLoading;

  // Dados formatados
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: followerCount,
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    onFollowToggle: () => {
      if (!isAuthenticated) {
        showError("Faça login para seguir este restaurante.");
        navigate(createPageUrl('auth'));
        return;
      }
      toggleFavorite();
      // Refetch manual para atualizar a contagem de seguidores após a mutação
      setTimeout(refetchFollowers, 500); 
    },
  };
  
  const scheduleStatus = useMemo(() => formatSchedule(restaurant.opening_hours as unknown as WeekSchedule), [restaurant.opening_hours]);
  
  const address = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state]
    .filter(Boolean)
    .join(', ');

  // Agrupamento de dados do menu para o MenuSection
  const menuData = useMemo(() => ({
    categories: menu.map(c => ({ 
      id: c.id, 
      restaurant_id: c.restaurant_id, 
      name: c.name, 
      order_index: c.order_index || 0, 
      is_active: c.is_active || false, 
      created_at: c.created_at || '' 
    })),
    items: menu.flatMap(c => c.items),
  }), [menu]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#f5f7f8] min-h-screen pt-20">
      
      {/* Header Público (Logo, Nome, Seguidores, Botões de Ação) */}
      <div className="relative z-10 bg-white dark:bg-gray-800 rounded-b-3xl shadow-lg pt-4 pb-8">
        <RestaurantPublicHeader restaurant={{
          ...headerData,
          onFollowToggle: headerData.onFollowToggle,
        }} />
        
        {/* Botão Seguir/Favoritar */}
        <div className="px-4 mt-4">
          <Button 
            onClick={headerData.onFollowToggle}
            disabled={isFavoriteLoading}
            className="w-full h-10 rounded-xl bg-highlight hover:bg-highlight/90 text-white font-bold flex items-center justify-center"
          >
            {isFavoriteLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <>
                <Heart className="w-5 h-5 mr-2" fill={isFavorite ? 'white' : 'none'} /> 
                {isFavorite ? 'Seguindo' : 'Seguir Restaurante'}
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Conteúdo Principal */}
      <div className="px-4 pb-20 space-y-6">
        
        {/* Status de Funcionamento e Endereço (Quick Info) */}
        <Card className="shadow-md border-none rounded-xl -mt-4 relative z-20">
          <CardContent className="p-4 space-y-3">
            {/* Horário */}
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-base font-semibold text-gray-900 truncate">{scheduleStatus.status}</p>
                {scheduleStatus.nextOpenTime && (
                  <p className="text-xs text-gray-600 mt-0.5">{scheduleStatus.nextOpenTime}</p>
                )}
              </div>
            </div>
            
            {/* Endereço */}
            {address && (
              <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500">Endereço</p>
                  <p className="text-base font-semibold text-gray-900 truncate">{address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Seção de Cardápio (Usando MenuSection) */}
        <MenuSection menuData={menuData} />
        
        {/* Informações Adicionais (Pagamento) */}
        <AdditionalInfo restaurant={restaurant} />
        
        {/* Horários Detalhados */}
        {restaurant.opening_hours && (
          <DetailedHoursDisplay schedule={restaurant.opening_hours as unknown as WeekSchedule} />
        )}
        
        {/* Descrição do Restaurante */}
        {restaurant.description && (
          <Card className="p-4">
            <h3 className="text-lg font-bold text-primary mb-2">Sobre {restaurant.name}</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{restaurant.description}</p>
          </Card>
        )}
        
      </div>
    </div>
  );
}