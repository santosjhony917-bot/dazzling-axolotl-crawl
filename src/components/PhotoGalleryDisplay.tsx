"use client";

import React from 'react';
import { GalleryImage } from '@/types/supabase'; // Assuming GalleryImage type is available
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface PhotoGalleryDisplayProps {
  images: GalleryImage[];
}

const PhotoGalleryDisplay: React.FC<PhotoGalleryDisplayProps> = ({ images }) => {
  if (!images || images.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Nenhuma imagem na galeria.</p>
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {images.map((image) => (
          <CarouselItem key={image.id} className="md:basis-1/2 lg:basis-1/3">
            <div className="p-1">
              <div className="relative overflow-hidden rounded-lg shadow-md">
                <img
                  src={image.image_url}
                  alt={image.caption || 'Imagem da galeria'}
                  className="w-full h-48 object-cover"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
                    {image.caption}
                  </div>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default PhotoGalleryDisplay;