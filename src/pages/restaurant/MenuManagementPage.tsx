import React from 'react';
import { RestaurantAreaPageLayout } from '@/components/restaurant/RestaurantAreaPageLayout';
import { Menu, Loader2 } from 'lucide-react';
import { useRestaurantData } from '@/context/RestaurantContext'; // Named import
import MenuManagement from '@/components/restaurant/MenuManagement'; // Import as default

const MenuManagementPage: React.FC = () => {
  const { restaurant, isLoading } = useRestaurantData();

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio">
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Nenhum restaurante encontrado para gerenciar o cardápio.
          </p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio">
      <div className="space-y-8 pb-20">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Menu className="h-6 w-6 text-primary" />
            Gerenciar Categorias e Itens
          </h2>
          <MenuManagement restaurantId={restaurant.id} />
        </section>
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default MenuManagementPage;