import React from 'react';
import { Restaurant, MenuItem } from '@/types';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Button } from '@/components/ui/button';
import { UserPlus, Heart, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { useAuthContext } from '@/context/AuthContext';
import { showInfo } from '@/utils/toast';
import { cn } from '@/lib/utils';

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
    <div className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-lg p-3 shadow-sm relative">
      <div 
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16 flex-shrink-0" 
        style={{ backgroundImage: `url("${item.image_url || PLACEHOLDER_IMAGE_URL}")` }}
        data-alt={item.name}
      />
      <div className="flex-1">
        <p className="text-[#111418] dark:text-white text-base font-bold leading-normal">{item.name}</p>
        <p className="text-highlight dark:text-gray-400 text-sm font-bold leading-normal">{formatPrice(item.price)}</p>
      </div>
      
      {/* Botão de Favoritar Item */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleFavorite}
        disabled={isMutating}
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm"
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
    alert("Seguindo restaurante! (Mock)");
  };
  
  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: mockFollowers,
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    onFollowToggle: handleFollowToggle,
  };

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
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-b-3xl shadow-xl pt-4 pb-20">
        <RestaurantPublicHeader restaurant={headerData} />
      </div>
      
      {/* Conteúdo Principal */}
      <div className="pt-4 px-4 pb-20 space-y-6">
        
        {/* Botão Seguir */}
        <Button 
          onClick={handleFollowToggle}
          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Seguir Restaurante
        </Button>
        
        {categories.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-primary">Cardápio</h2>
            {categories.map(category => (
              <Card key={category.id} className="border p-4 rounded-xl shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-gray-800">{category.name}</h3>
                <div className="space-y-3">
                  {(category.items || []).map(item => (
                    <FreeMenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum item de menu disponível.</p>
        )}
      </div>
    </div>
  );
}