"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface RestaurantGalleryProps {
  restaurantId: string;
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ restaurantId }) => {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGalleryImages = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('restaurant_gallery')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setImages(data || []);
      }
      setIsLoading(false);
    };

    fetchGalleryImages();
  }, [restaurantId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Galeria</CardTitle></CardHeader>
        <CardContent className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Galeria</CardTitle></CardHeader>
        <CardContent className="text-red-500">Erro ao carregar galeria: {error}</CardContent>
      </Card>
    );
  }

  if (images.length === 0) {
    return null; // Não renderiza a seção se não houver imagens
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Galeria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative aspect-video overflow-hidden rounded-lg">
              <img
                src={image.image_url}
                alt={image.caption || 'Imagem da galeria'}
                className="w-full h-full object-cover"
              />
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
                  {image.caption}
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