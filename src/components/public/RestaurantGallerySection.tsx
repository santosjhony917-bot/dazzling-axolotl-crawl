import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { usePublicGallery } from '@/hooks/usePublicGallery';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay';
import { RestaurantPlan } from '@/types/supabase';

interface RestaurantGallerySectionProps {
  id: string;
  restaurantId: string;
  plan: RestaurantPlan;
}

const RestaurantGallerySection: React.FC<RestaurantGallerySectionProps> = ({ id, restaurantId, plan }) => {
  const { gallery, isLoading, error } = usePublicGallery(restaurantId);
  
  const isPremium = plan === 'premium' || plan === 'premium_gift';
  
  if (!isPremium) {
    return null;
  }

  if (isLoading) {
    return (
      <div id={id} className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div id={id} className="text-center p-4 bg-red-50 border-red-300 rounded-lg">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 mt-2">Falha ao carregar a galeria.</p>
      </div>
    );
  }
  
  if (gallery.length === 0) {
    return null;
  }

  return (
    <div id={id}>
      <PhotoGalleryDisplay 
        gallery={gallery} 
        restaurantName={gallery?.[0]?.caption || "Restaurante"} 
        isLoading={isLoading}
      />
    </div>
  );
};

export default RestaurantGallerySection;