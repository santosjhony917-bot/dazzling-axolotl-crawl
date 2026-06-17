import React from 'react';
import { createPortal } from 'react-dom';
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

  const totalImages = gallery.length;

  return (
    <div id="gallery" className="space-y-4">
      {/* Título da seção ajustado para 2xl */}
      <h2 className="text-2xl font-extrabold text-primary">Fotos</h2>
      
      {totalImages === 1 && (
        <Card 
          className="overflow-hidden rounded-2xl shadow-none border-none p-0 cursor-pointer h-[200px] relative"
          onClick={() => setCurrentIndex(0)}
        >
          {isVideoUrl(gallery[0].image_url) ? (
            <div className="relative w-full h-full overflow-hidden">
              <video
                src={gallery[0].image_url}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          ) : (
            <img
              src={gallery[0].image_url}
              alt={gallery[0].caption || 'Imagem do local'}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
            />
          )}
          {gallery[0].caption && (
            <div className="absolute bottom-0 left-0 p-3 bg-gradient-to-t from-black/60 to-transparent w-full z-10">
              <p className="text-white text-xs font-semibold truncate">{gallery[0].caption}</p>
            </div>
          )}
        </Card>
      )}

      {totalImages === 2 && (
        <div className="grid grid-cols-2 gap-2 h-[160px]">
          {gallery.map((image, idx) => (
            <Card 
              key={image.id}
              className="overflow-hidden rounded-2xl shadow-none border-none p-0 cursor-pointer h-full relative"
              onClick={() => setCurrentIndex(idx)}
            >
              {isVideoUrl(image.image_url) ? (
                <div className="relative w-full h-full overflow-hidden">
                  <video
                    src={image.image_url}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={image.image_url}
                  alt={image.caption || 'Imagem do local'}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              )}
              {image.caption && (
                <div className="absolute bottom-0 left-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent w-full z-10">
                  <p className="text-white text-[11px] font-semibold truncate">{image.caption}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalImages >= 3 && (
        <div className="grid grid-cols-3 gap-2 h-[320px]">
          {[0, 1, 2].map((slotIndex) => {
            const image = gallery[slotIndex];
            const isVideo = isVideoUrl(image.image_url);
            const isLarge = slotIndex === 0;
            const isLast = slotIndex === 2;
            const remainingCount = totalImages - 3;
            const hasMore = isLast && remainingCount > 0;

            const cardClass = isLarge 
              ? "col-span-2 row-span-2 h-full" 
              : "col-span-1 h-[156px]";

            return (
              <Card
                key={image.id}
                className={cn("relative overflow-hidden rounded-2xl shadow-none border-none p-0 cursor-pointer", cardClass)}
                onClick={() => setCurrentIndex(slotIndex)}
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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition-colors z-10">
                      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md">
                        <Play className="w-4 h-4 text-[#EF2A39] fill-[#EF2A39] ml-0.5" />
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

                {hasMore ? (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 transition-all duration-300 hover:bg-black/70">
                    <span className="text-white font-extrabold text-sm tracking-wide">
                      +{remainingCount} {remainingCount === 1 ? 'foto' : 'fotos'}
                    </span>
                    <span className="text-white/85 text-[9px] font-bold uppercase tracking-wider mt-1">
                      Ver todas
                    </span>
                  </div>
                ) : (
                  !isLarge && image.caption && (
                    <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/60 to-transparent w-full z-10">
                      <p className="text-white text-[11px] font-semibold truncate">{image.caption}</p>
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal para visualização expandida com suporte a deslizar e limite de largura */}
      {currentIndex !== null && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between items-center select-none"
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
          <div className="relative flex-grow w-full flex items-center justify-center p-4 overflow-hidden" onClick={handleClose}>
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
                className="max-w-full max-h-full object-contain z-10"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img 
                src={gallery[currentIndex].image_url} 
                alt={gallery[currentIndex].caption || 'Imagem ampliada'} 
                className="max-w-full max-h-full object-contain transition-transform duration-300 pointer-events-none"
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default RestaurantGallery;