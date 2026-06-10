import React, { memo } from 'react';
import { cn } from '@/lib/utils';

interface GalleryItem {
  imageUrl: string;
  caption: string;
}

interface PhotoGalleryProps {
  gallery: GalleryItem[];
}

const GalleryImage = memo(({ item, className }: { item: GalleryItem, className?: string }) => (
  <div className={cn("relative h-full rounded-2xl overflow-hidden", className)}>
    <img className="w-full h-full object-cover" alt={item.caption} src={item.imageUrl} />
    <div className="absolute bottom-0 left-0 p-2 bg-gradient-to-t from-black/50 to-transparent w-full">
      <p className="text-white text-sm font-semibold">{item.caption}</p>
    </div>
  </div>
));

const PhotoGallery: React.FC<PhotoGalleryProps> = memo(({ gallery }) => {
  
  // Layout: 1 grande (col-span-2) e 2 pequenos (col-span-1)
  const largeItem = gallery[0];
  const smallItems = gallery.slice(1, 3);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-primary">Sinta o ambiente antes de chegar</h2>
      <div className="grid grid-cols-3 gap-2 mt-4 h-[320px]">
        {largeItem && (
          <GalleryImage item={largeItem} className="col-span-2 row-span-2" />
        )}
        {smallItems.map((item, index) => (
          <GalleryImage key={index} item={item} className="col-span-1 h-[156px]" />
        ))}
      </div>
    </div>
  );
});

export default PhotoGallery;