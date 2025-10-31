import React from 'react';
import { GalleryImage } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Image } from 'lucide-react';

interface RestaurantGalleryProps {
  gallery: GalleryImage[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (gallery.length === 0) return null;

  const topImages = gallery.slice(0, 3);
  const remainingCount = gallery.length > 3 ? gallery.length - 3 : 0;

  // Array representando os 3 slots que queremos preencher
  const slots = [0, 1, 2]; 

  return (
    <div id="gallery" className="space-y-4">
      <h2 className="text-xl font-bold text-[#022D68]">Fotos</h2>
      
      {/* Grid principal 3 colunas, altura fixa para 2 linhas de 156px + gap (320px total) */}
      <div className="grid grid-cols-3 gap-2 h-[320px]"> 
        {slots.map((slotIndex) => {
          const image = topImages[slotIndex];
          
          let classes = "col-span-1 h-[156px]";
          let content;
          
          if (slotIndex === 0) {
            // Slot 1: Imagem grande (2x2)
            classes = "col-span-2 row-span-2 h-full";
          }
          
          // 1. Verifica se deve renderizar o placeholder "+X fotos" no terceiro slot
          if (slotIndex === 2 && remainingCount > 0) {
            content = (
              <div className="text-center text-primary font-bold">
                +{remainingCount} fotos
              </div>
            );
            classes = cn(classes, "bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors");
          } else if (image) {
            // 2. Renderiza a imagem real
            const showCaption = slotIndex !== 0;
            content = (
              <>
                <img
                  src={image.image_url}
                  alt={image.caption || 'Imagem da galeria'}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {showCaption && image.caption && (
                  <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full">
                    <p className="text-white text-sm font-semibold drop-shadow-md truncate">{image.caption}</p>
                  </div>
                )}
              </>
            );
          } else {
            // 3. Renderiza placeholder genérico (se houver menos de 3 imagens e não for o slot de contagem)
            content = <Image className="w-8 h-8 text-gray-500" />;
            classes = cn(classes, "bg-gray-200 flex items-center justify-center");
          }

          // Aplica Card wrapper e classes
          return (
            <Card 
              key={slotIndex} 
              className={cn("relative overflow-hidden rounded-xl shadow-soft-md border-none p-0", classes)}
            >
              {content}
            </Card>
          );
        })}
      </div>
      
      {/* Se houver mais de 3 imagens, listamos o restante em um grid simples abaixo */}
      {remainingCount > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {gallery.slice(3).map((image) => (
            <Card 
              key={image.id} 
              className="overflow-hidden rounded-xl shadow-soft-md border-none p-0 aspect-square"
            >
              <img
                src={image.image_url}
                alt={image.caption || 'Imagem da galeria'}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantGallery;