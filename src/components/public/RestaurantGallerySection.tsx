import React from 'react';
import { Image, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublicGallery } from '@/hooks/usePublicGallery';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay'; // Componente que renderiza a galeria
import { RestaurantPlan } from '@/types/supabase';

interface RestaurantGallerySectionProps {
  id: string;
  restaurantId: string;
  plan: RestaurantPlan; // Adicionando a prop plan
}

const RestaurantGallerySection: React.FC<RestaurantGallerySectionProps> = ({ id, restaurantId, plan }) => {
  const { gallery, isLoading, error } = usePublicGallery(restaurantId);
  
  const isPremium = plan === 'premium' || plan === 'premium_gift';
  
  if (!isPremium) {
    // Se não for Premium, não exibe nada para o usuário final.
    return null;
  }

  if (isLoading) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Carregando galeria...</p>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center bg-red-50 border-red-300">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 mt-2">Falha ao carregar a galeria.</p>
      </Card>
    );
  }
  
  if (gallery.length === 0) {
    return null; // Não exibe a seção se não houver fotos, mesmo sendo Premium
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Image className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold text-primary">Galeria de Fotos</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Reutilizando o PhotoGalleryDisplay, mas adaptando para a estrutura pública */}
        <PhotoGalleryDisplay 
          gallery={gallery} 
          restaurantName={gallery[0]?.caption || "Restaurante"} 
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};

export default RestaurantGallerySection;