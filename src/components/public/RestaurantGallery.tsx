import React from 'react';
import { GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface RestaurantGalleryProps {
  gallery: GalleryImage[] | null;
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) {
    return (
      <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
        <p className="text-xl font-semibold">Nenhuma imagem na galeria.</p>
        <p className="mt-2">O restaurante ainda não adicionou imagens à sua galeria.</p>
      </div>
    );
  }

  const sortedGallery = [...gallery].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  return (
    <Card className="p-4 shadow-soft-md rounded-xl">
      <h3 className="text-xl font-extrabold text-[#022D68] mb-4">Galeria de Fotos</h3>
      <Carousel className="w-full">
        <CarouselContent>
          {sortedGallery.map((image, index) => (
            <CarouselItem key={image.id || index} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card className="overflow-hidden rounded-lg shadow-soft-sm">
                  <img 
                    src={image.image_url} 
                    alt={image.caption || `Galeria de ${index + 1}`} 
                    className="w-full h-48 object-cover"
                  />
                  {image.caption && (
                    <p className="p-2 text-sm text-gray-700">{image.caption}</p>
                  )}
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </Card>
  );
};

export default RestaurantGallery;