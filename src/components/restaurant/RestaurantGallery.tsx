import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { RestaurantGallery as GalleryItem } from '@/types/supabase';

interface RestaurantGalleryProps {
  restaurantId: string;
}

const fetchGallery = async (restaurantId: string): Promise<GalleryItem[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ restaurantId }) => {
  const { data: images, isLoading, error } = useQuery({
    queryKey: ['restaurantGallery', restaurantId],
    queryFn: () => fetchGallery(restaurantId),
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 dark:text-red-400">Erro ao carregar a galeria: {error.message}</p>;
  }

  if (!images || images.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Nenhuma imagem na galeria.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <div key={image.id} className="relative aspect-video overflow-hidden rounded-lg shadow-md group">
          <img
            src={image.image_url}
            alt={image.caption || 'Imagem da galeria'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {image.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 text-white text-xs truncate">
              {image.caption}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RestaurantGallery;