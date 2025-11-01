import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Image as ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
}

interface RestaurantGalleryProps {
  id: string; // Adicionando a prop 'id'
  restaurantId: string;
}

const fetchGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('id, image_url, caption, order_index')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data as GalleryImage[];
};

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ id, restaurantId }) => {
  const { data: gallery, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ['restaurantGallery', restaurantId],
    queryFn: () => fetchGallery(restaurantId),
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
        <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
          <ImageIcon className="w-6 h-6 text-primary" />
          <CardTitle className="text-2xl font-extrabold text-primary">Galeria</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!gallery || gallery.length === 0) {
    return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <ImageIcon className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Galeria</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {gallery.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-lg shadow-md group">
              <img
                src={image.image_url}
                alt={image.caption || "Imagem da galeria"}
                className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {image.caption && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantGallery;