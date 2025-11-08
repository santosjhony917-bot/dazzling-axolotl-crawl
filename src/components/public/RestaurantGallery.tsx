"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface GalleryImage {
  id: string;
  image_url: string;
  caption?: string;
  order_index?: number;
}

interface RestaurantGalleryProps {
  images: GalleryImage[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ images }) => {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <h2 className="text-xl font-semibold mb-4">Galeria</h2>
        <Carousel className="w-full">
          <CarouselContent>
            {images.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((image) => (
              <CarouselItem key={image.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card>
                    <CardContent className="flex aspect-square items-center justify-center p-6">
                      <img
                        src={image.image_url}
                        alt={image.caption || "Imagem da galeria"}
                        className="object-cover w-full h-full rounded-md"
                      />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </CardContent>
    </Card>
  );
};

export default RestaurantGallery;