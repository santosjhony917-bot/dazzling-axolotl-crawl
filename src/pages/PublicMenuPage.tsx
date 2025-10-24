import React from 'react';
import { useParams } from 'react-router-dom';
import { usePublicMenu } from '@/hooks/usePublicMenu';
import { Skeleton } from '@/components/ui/skeleton';
import PublicRestaurantLayout from '@/components/PublicRestaurantLayout';
import MenuCategoryList from '@/components/menu/MenuCategoryList';
import { Utensils } from 'lucide-react';

const PublicMenuPage: React.FC = () => {
  // Usando 'restaurantId' conforme definido na rota: /menu/:restaurantId
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { menuData, isLoading, error } = usePublicMenu(restaurantId);

  if (!restaurantId) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Cardápio">
        <div className="p-4 text-center text-red-500">ID do Restaurante não fornecido.</div>
      </PublicRestaurantLayout>
    );
  }

  if (isLoading) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Cardápio">
        <div className="p-4 space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PublicRestaurantLayout>
    );
  }

  if (error) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Cardápio">
        <div className="p-4 text-center text-red-500">Erro ao carregar o cardápio.</div>
      </PublicRestaurantLayout>
    );
  }

  if (!menuData || !menuData.restaurant) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Cardápio">
        <div className="p-4 text-center text-gray-600">Restaurante não encontrado.</div>
      </PublicRestaurantLayout>
    );
  }

  const { restaurant, categories } = menuData;

  return (
    <PublicRestaurantLayout restaurant={restaurant} title={`Cardápio de ${restaurant.name}`} backPath={`restaurant-profile/${restaurant.id}`}>
      <div className="p-4 space-y-8">
        <div className="flex items-center gap-2 text-[#022D68]">
          <Utensils className="w-6 h-6" />
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        </div>
        
        {categories.length === 0 ? (
          <div className="text-center text-gray-500 p-10 border border-dashed rounded-lg">
            Nenhuma categoria de menu encontrada.
          </div>
        ) : (
          <MenuCategoryList categories={categories} />
        )}
      </div>
    </PublicRestaurantLayout>
  );
};

export default PublicMenuPage;