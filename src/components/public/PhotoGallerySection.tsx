import React from 'react';
import { Card } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoGallerySectionProps {
  images: string[];
  restaurantName: string;
}

const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({ images, restaurantName }) => {
  if (images.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-2xl shadow-none border-none p-6 text-center">
        <Camera className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhuma foto na galeria.</p>
      </Card>
    );
  }
  
  // Exibição simplificada: 1 imagem grande e o restante em grid
  const mainImage = images[0];
  const gridImages = images.slice(1, 5); // Limita a 4 imagens no grid

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">Galeria de Fotos</h2>
      <div className="grid grid-cols-2 gap-2 h-64">
        {/* Imagem Principal */}
        <div className="relative col-span-2 row-span-1 overflow-hidden rounded-2xl bg-slate-50">
          <img 
            src={mainImage} 
            alt={`Foto principal de ${restaurantName}`} 
            className="h-full w-full object-contain" 
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white font-bold text-lg">
            {images.length > 1 ? `+${images.length - 1} fotos` : ''}
          </div>
        </div>
      </div>
      
      {/* Grid de miniaturas (se houver mais) */}
      {gridImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {gridImages.map((img, index) => (
            <div key={index} className="aspect-square overflow-hidden rounded-lg bg-slate-50">
              <img 
                src={img} 
                alt={`Miniatura ${index + 1}`} 
                className="h-full w-full object-contain" 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGallerySection;
