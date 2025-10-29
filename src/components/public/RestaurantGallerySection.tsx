import React from 'react';
import { Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantGallerySectionProps {
  id: string;
  restaurantId: string;
  isPremium: boolean;
}

const RestaurantGallerySection: React.FC<RestaurantGallerySectionProps> = ({ id, restaurantId, isPremium }) => {
  // NOTE: Implementação futura para buscar e exibir imagens da galeria
  
  return (
    <Card id={id} className="shadow-md">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b">
        <Image className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold">Galeria de Fotos</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-gray-500">As fotos do restaurante serão exibidas aqui.</p>
        {/* Placeholder para grid de imagens */}
      </CardContent>
    </Card>
  );
};

export default RestaurantGallerySection;