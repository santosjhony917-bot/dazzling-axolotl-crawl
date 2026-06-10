import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PublicGalleryImage } from '@/hooks/usePublicGallery';

interface PhotoGalleryDisplayProps {
  gallery: PublicGalleryImage[];
  restaurantName: string;
  isLoading: boolean;
}

const PhotoGalleryDisplay: React.FC<PhotoGalleryDisplayProps> = ({ gallery, restaurantName, isLoading }) => {
  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  }
  
  if (gallery.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-none border-none p-6 text-center">
        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhuma foto na galeria.</p>
      </Card>
    );
  }
  
  // Layout: 1 grande (col-span-2) e 2 pequenas (col-span-1)
  const largeItem = gallery[0];
  const smallItems = gallery.slice(1, 3);
  const remainingCount = gallery.length - 3;

  return (
    <div className="mt-0">
      <div className="grid grid-cols-3 gap-2 h-[320px]">
        {/* Imagem Principal */}
        {largeItem && (
          <div className="col-span-2 row-span-2 relative rounded-2xl overflow-hidden shadow-none">
            <img 
              className="w-full h-full object-cover" 
              alt={largeItem.caption || `Foto de ${restaurantName}`} 
              src={largeItem.image_url} 
            />
            {remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-xl">
                +{remainingCount} fotos
              </div>
            )}
          </div>
        )}
        
        {/* Imagens Pequenas */}
        {smallItems.map((item, index) => (
          <div key={item.id} className="col-span-1 h-[156px] relative rounded-2xl overflow-hidden shadow-none">
            <img 
              className="w-full h-full object-cover" 
              alt={item.caption || `Foto ${index + 2}`} 
              src={item.image_url} 
            />
            <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full">
              <p className="text-white text-xs font-semibold drop-shadow-none truncate">{item.caption || 'Foto'}</p>
            </div>
          </div>
        ))}
        
        {/* Placeholder se houver menos de 3 imagens */}
        {gallery.length < 3 && Array.from({ length: 3 - gallery.length }).map((_, index) => (
          <div key={`placeholder-${index}`} className="col-span-1 h-[156px] relative rounded-2xl overflow-hidden shadow-none bg-gray-200 flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-500" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoGalleryDisplay;