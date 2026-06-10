import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
}

const fetchGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from('restaurant_gallery')
    .select('id, image_url, caption')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) {
    showError("Erro ao carregar galeria.");
    throw error;
  }
  return data as GalleryImage[];
};

interface GallerySectionProps {
  restaurantId: string;
}

const GallerySection: React.FC<GallerySectionProps> = ({ restaurantId }) => {
  const { data: images, isLoading } = useQuery({
    queryKey: ['restaurantGallery', restaurantId],
    queryFn: () => fetchGallery(restaurantId),
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <section id="gallery" className="p-4">
      <Card className="shadow-none border-none rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-extrabold text-primary flex items-center gap-2">
            <Camera className="w-6 h-6" /> Galeria
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {images.slice(0, 4).map((image) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg">
              <img
                src={image.image_url}
                alt={image.caption || 'Imagem do restaurante'}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          ))}
          {images.length > 4 && (
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
              +{images.length - 4} fotos
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default GallerySection;