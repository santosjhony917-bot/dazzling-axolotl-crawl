import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';
import { Card, CardContent } from '@/components/ui/card';

interface GallerySectionProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const GallerySection: React.FC<GallerySectionProps> = ({ restaurant }) => {
  const galleryImages = restaurant.restaurant_gallery || [];

  if (galleryImages.length === 0) {
    return (
      <section className="py-6">
        <h2 className="text-2xl font-bold mb-4">Galeria</h2>
        <p className="text-gray-600">Nenhuma imagem na galeria no momento.</p>
      </section>
    );
  }

  return (
    <section className="py-6">
      <h2 className="text-2xl font-bold mb-4">Galeria</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {galleryImages.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <img src={image.image_url} alt={image.caption || "Imagem da galeria"} className="w-full h-32 object-cover" />
            {image.caption && (
              <CardContent className="p-2 text-sm text-gray-600">
                {image.caption}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};

export default GallerySection;