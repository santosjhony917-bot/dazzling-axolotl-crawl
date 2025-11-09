import React from 'react';
import { RestaurantAreaPageLayout } from '@/components/restaurant/RestaurantAreaPageLayout';
import { Image as ImageIcon, Loader2 } from 'lucide-react'; // Alias Image
import { useRestaurantData } from '@/context/RestaurantContext'; // Named import
import GalleryManagement from '@/components/restaurant/GalleryManagement'; // Import as default

const GalleryManagementPage: React.FC = () => {
  const { restaurant, isLoading } = useRestaurantData();

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Galeria">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Galeria">
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Nenhum restaurante encontrado para gerenciar a galeria.
          </p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Galeria">
      <div className="space-y-8 pb-20">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Gerenciar Imagens da Galeria
          </h2>
          <GalleryManagement restaurantId={restaurant.id} />
        </section>
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default GalleryManagementPage;