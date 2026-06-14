import React from 'react';
import { GalleryImage } from '@/types/supabase';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Image, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface RestaurantGalleryProps {
  gallery: GalleryImage[];
}

const isVideoUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.quicktime') ||
    url.includes('/video/') ||
    url.includes('_video')
  );
};

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (gallery.length === 0) return null;

  const [currentIndex, setCurrentIndex] = React.useState<number | null>(null);

  const handleClose = () => setCurrentIndex(null);

  const handleNext = () => {
    if (currentIndex === null) return;
    setCurrentIndex((prevIndex) => {
      if (prevIndex === null) return null;
      return (prevIndex + 1) % gallery.length;
    });
  };

  const handlePrev = () => {
    if (currentIndex === null) return;
    setCurrentIndex((prevIndex) => {
      if (prevIndex === null) return null;
      return (prevIndex - 1 + gallery.length) % gallery.length;
    });
  };

  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const difference = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50;
    
    if (difference > swipeThreshold) {
      handleNext();
    } else if (difference < -swipeThreshold) {
      handlePrev();
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') handleClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  React.useEffect(() => {
    if (currentIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentIndex]);

  const topImages = gallery.slice(0, 3);
  const remainingCount = gallery.length > 3 ? gallery.length - 3 : 0;

  // Array representando os 3 slots que queremos preencher
  const slots = [0, 1, 2]; 

  return (
    <div id="gallery" className="space-y-4">
      {/* Título da seção ajustado para 2xl */}
      <h2 className="text-2xl font-extrabold text-primary">Fotos</h2>
      
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
            // 2. Renderiza a imagem/video real
            const showCaption = slotIndex !== 0;
            const isVideo = isVideoUrl(image.image_url);
            content = (
              <>
                {isVideo ? (
                  <div className="relative w-full h-full overflow-hidden">
                    <video
                      src={image.image_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition-colors z-10">
                      <div className="bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg">
                        <Play className="w-5 h-5 text-[#EF2A39] fill-[#EF2A39] ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={image.image_url}
                    alt={image.caption || 'Imagem da galeria'}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                )}
                {showCaption && image.caption && (
                  <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full z-10">
                    <p className="text-white text-sm font-semibold drop-shadow-none truncate">{image.caption}</p>
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
              className={cn("relative overflow-hidden rounded-2xl shadow-none border-none p-0 cursor-pointer", classes)}
              onClick={() => setCurrentIndex(slotIndex)}
            >
              {content}
            </Card>
          );
        })}
      </div>
      
      {/* Se houver mais de 3 imagens, listamos o restante em um grid simples abaixo */}
      {remainingCount > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {gallery.slice(3).map((image, index) => {
            const isVideo = isVideoUrl(image.image_url);
            return (
              <Card 
                key={image.id} 
                className="overflow-hidden rounded-2xl shadow-none border-none p-0 aspect-square cursor-pointer relative"
                onClick={() => setCurrentIndex(index + 3)}
              >
                {isVideo ? (
                  <div className="relative w-full h-full overflow-hidden">
                    <video
                      src={image.image_url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 z-10">
                      <div className="bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow">
                        <Play className="w-3.5 h-3.5 text-[#EF2A39] fill-[#EF2A39] ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={image.image_url}
                    alt={image.caption || 'Imagem da galeria'}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal para visualização expandida com suporte a deslizar e limite de largura */}
      {currentIndex !== null && (
        <div 
          className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-black/95 flex flex-col justify-between items-center select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Barra Superior: Contador e Botão Fechar */}
          <div className="w-full flex justify-between items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
            <span className="text-white font-medium text-sm">
              {currentIndex + 1} de {gallery.length}
            </span>
            <button 
              onClick={handleClose}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Área Central: Imagem e Setas de Navegação */}
          <div className="relative flex-grow w-full flex items-center justify-center p-4" onClick={handleClose}>
            {/* Seta Esquerda (Desktops/Tablets) */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Imagem/Vídeo Ampliado */}
            {isVideoUrl(gallery[currentIndex].image_url) ? (
              <video 
                src={gallery[currentIndex].image_url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain z-10"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img 
                src={gallery[currentIndex].image_url} 
                alt={gallery[currentIndex].caption || 'Imagem ampliada'} 
                className="max-w-full max-h-[75vh] md:max-h-[80vh] object-contain transition-transform duration-300 pointer-events-none"
              />
            )}

            {/* Seta Direita (Desktops/Tablets) */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Área Inferior: Legenda e Dica Swipe */}
          <div className="w-full p-6 text-center bg-gradient-to-t from-black/80 to-transparent">
            {gallery[currentIndex].caption && (
              <p className="text-white text-base md:text-lg font-medium drop-shadow-none">
                {gallery[currentIndex].caption}
              </p>
            )}
            <p className="text-gray-400 text-xs mt-2 md:hidden">
              Arraste para o lado para navegar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantGallery;