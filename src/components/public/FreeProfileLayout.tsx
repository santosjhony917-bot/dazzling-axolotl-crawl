import React, { useMemo } from 'react';
import { Restaurant, MenuItem } from '@/types';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Button } from '@/components/ui/button';
import { UserPlus, Heart, Loader2, MapPin, Clock, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { useAuthContext } from '@/context/AuthContext';
import { showInfo } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { formatSchedule } from '@/utils/schedule';
import { WeekSchedule } from '@/types/schedule';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente de Card de Item de Menu com Favorito (Versão Free)
const FreeMenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  const { isItemFavorite, toggleItemFavorite, isLoading: isMutating } = useMenuItemFavorites();
  const isFavorite = isItemFavorite(item.id);
  const { user } = useAuthContext();
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showInfo("Faça login para favoritar pratos!");
      return;
    }
    toggleItemFavorite({ itemId: item.id, isCurrentlyFavorite: isFavorite });
  };

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-xl p-3 shadow-soft-sm relative border border-gray-100">
      <div 
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16 flex-shrink-0" 
        style={{ backgroundImage: `url("${item.image_url || PLACEHOLDER_IMAGE_URL}")` }}
        data-alt={item.name}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[#111418] dark:text-white text-base font-bold leading-normal truncate">{item.name}</p>
        <p className="text-highlight dark:text-gray-400 text-sm font-bold leading-normal">{formatPrice(item.price)}</p>
      </div>
      
      {/* Botão de Favoritar Item */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleFavorite}
        disabled={isMutating}
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm shadow-soft-sm"
      >
        <Heart 
          className={cn(
            "w-4 h-4 transition-colors",
            isFavorite ? "text-red-500 fill-red-500" : "text-gray-500 hover:text-red-500"
          )}
        />
      </Button>
    </div>
  );
};


export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const { menu, menuLoading } = useRestaurantMenu(restaurant.id); 
  
  const categories = menu || [];
  const isMenuLoading = menuLoading;
  
  // Mock de seguidores para Free
  const mockFollowers = 50; 
  
  const handleFollowToggle = () => {
    showInfo("Funcionalidade de seguir em desenvolvimento.");
  };
  
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: mockFollowers,
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    onFollowToggle: handleFollowToggle,
  };
  
  const address = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state]
    .filter(Boolean)
    .join(', ');
    
  const scheduleInfo = useMemo(() => formatSchedule(restaurant.opening_hours as unknown as WeekSchedule), [restaurant.opening_hours]);

  if (isMenuLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#f5f7f8] min-h-screen">
      
      {/* Header Flutuante (Logo, Nome, Botões) */}
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-b-2xl shadow-soft-xl pt-12 pb-20">
        <RestaurantPublicHeader restaurant={headerData} />
      </div>
      
      {/* Conteúdo Principal */}
      <div className="pt-4 px-4 pb-20 space-y-6">
        
        {/* Botão Seguir */}
        <Button 
          onClick={handleFollowToggle}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-soft-md"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Seguir Restaurante
        </Button>
        
        {/* Informações Essenciais (Endereço e Horário) */}
        <Card className="shadow-soft-lg border-none rounded-xl p-4 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-bold text-primary mb-4">Informações</h2>
          <div className="space-y-3">
            {/* Endereço */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-highlight shrink-0 mt-1" />
              <div className="flex flex-col">
                <p className="text-sm font-bold text-primary">Localização</p>
                <p className="text-sm text-gray-700">{address || "Endereço não cadastrado"}</p>
              </div>
            </div>
            
            {/* Horário */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-highlight shrink-0 mt-1" />
              <div className="flex flex-col">
                <p className="text-sm font-bold text-primary">Horário</p>
                <p className="text-sm text-gray-700">{scheduleInfo.status}</p>
                {scheduleInfo.nextOpenTime && (
                  <p className="text-xs text-gray-500 mt-0.5">{scheduleInfo.nextOpenTime}</p>
                )}
              </div>
            </div>
            
            {/* Categoria */}
            {restaurant.category && (
              <div className="flex items-start gap-3">
                <Utensils className="w-5 h-5 text-highlight shrink-0 mt-1" />
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-primary">Culinária</p>
                  <p className="text-sm text-gray-700">{restaurant.category}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* Descrição do Restaurante */}
        {restaurant.description && (
          <Card className="p-4 shadow-soft-md border-none rounded-xl bg-white dark:bg-gray-800">
            <h3 className="text-lg font-bold text-primary mb-2">Sobre {restaurant.name}</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{restaurant.description}</p>
          </Card>
        )}

        {/* Seção de Cardápio */}
        {categories.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary">Cardápio</h2>
            {categories.map(category => (
              <Card key={category.id} className="border p-4 rounded-xl shadow-soft-md border-gray-200 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{category.name}</h3>
                <div className="space-y-3">
                  {(category.items || []).map(item => (
                    <FreeMenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center p-8 bg-white rounded-xl shadow-soft-md">Nenhum item de menu disponível.</p>
        )}
      </div>
    </div>
  );
}