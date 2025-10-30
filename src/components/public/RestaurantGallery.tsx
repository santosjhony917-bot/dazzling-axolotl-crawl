import React from 'react';
import { Image, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicGalleryImage } from '@/hooks/usePublicGallery';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay';
import { RestaurantPlan } from '@/types/supabase';

interface RestaurantGalleryProps {
  id: string;
  restaurantId: string;
  plan: RestaurantPlan;
  galleryImages: PublicGalleryImage[] | null | undefined; // Recebe as imagens diretamente do layout
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ id, restaurantId, plan, galleryImages }) => {
  
  // CORREÇÃO: Incluindo 'premium_gift' na verificação
  const isPremium = plan === 'premium' || plan === 'premium_gift';
  
  // Garantir que galleryImages seja um array para evitar o erro .length
  const images = galleryImages || [];

  if (!isPremium) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center bg-gray-50 border-dashed border-gray-300">
        <Lock className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-sm font-semibold text-primary mt-2">Galeria de Fotos (Recurso Premium)</p>
        <p className="text-xs text-gray-500 mt-1">Faça upgrade para exibir suas melhores fotos aqui.</p>
      </Card>
    );
  }
  
  if (images.length === 0) {
    return null; // Não exibe a seção se não houver fotos, mesmo sendo Premium
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Image className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold text-primary">Galeria de Fotos</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <PhotoGalleryDisplay 
          gallery={images} 
          restaurantName={images[0]?.caption || "Restaurante"} 
          isLoading={false} // Já carregado pelo layout pai
        />
      </CardContent>
    </Card>
  );
};

export default RestaurantGallery;