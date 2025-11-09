import React from 'react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { Image } from 'lucide-react';

const GalleryManagementPage: React.FC = () => {
  return (
    <RestaurantAreaPageLayout 
      title="Gerenciamento de Galeria" 
      icon={Image} 
      backPath="restaurant-area/home"
    >
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Em construção: Adicione e organize as fotos do seu restaurante.</h2>
        {/* Implementação futura do gerenciamento de galeria */}
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default GalleryManagementPage;