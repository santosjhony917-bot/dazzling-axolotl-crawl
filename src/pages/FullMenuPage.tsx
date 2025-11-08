import React from 'react';
import { useParams } from 'react-router-dom';
import { useMenuCategories } from '@/hooks/useMenuCategories';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { Utensils } from 'lucide-react';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import RestaurantPageHeader from '@/components/public/RestaurantPageHeader';

const FullMenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  
  if (!restaurantId) {
    return <div>Restaurante não encontrado.</div>;
  }

  const { restaurant, isLoading: isLoadingRestaurant } = usePublicRestaurant(restaurantId);
  const { data: menuCategories, isLoading: isLoadingMenu } = useMenuCategories(restaurantId);

  if (isLoadingRestaurant || isLoadingMenu) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return <div>Restaurante não encontrado.</div>;
  }

  if (!menuCategories || menuCategories.length === 0) {
    return (
      <div className="p-4">
        <RestaurantPageHeader restaurantName={restaurant.name} />
        <div className="text-center p-6 mt-4 bg-white rounded-xl shadow-sm">
          <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">O cardápio deste restaurante está vazio no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <RestaurantPageHeader restaurantName={restaurant.name} />
      <div className="mt-4">
        <RestaurantMenu 
          menuCategories={menuCategories} 
          isFullMenuPage={true} 
          restaurantId={restaurantId}
        />
      </div>
    </div>
  );
};

export default FullMenuPage;