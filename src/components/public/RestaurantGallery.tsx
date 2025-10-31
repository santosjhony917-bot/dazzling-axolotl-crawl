import React from 'react';
import { RestaurantGalleryImage } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import GalleryImage from './GalleryImage';

interface RestaurantGalleryProps {
  gallery: RestaurantGalleryImage[];
}

const RestaurantGallery: React.FC<RestaurantGalleryProps> = ({ gallery }) => {
  if (!gallery || gallery.length === 0) {
    return null;
  }

  const featuredImages = gallery.slice(0, 3);
  const remainingImages = gallery.slice(3);

  // Logic to determine grid classes for the first 3 images
  const featuredItemClasses = (index: number) => {
    if (featuredImages.length >= 3) {
      // 1 large vertical + 2 small horizontal (User requested layout)
      if (index === 0) return "row-span-2 col-span-1";
      return "col-span-1";
    } else if (featuredImages.length === 2) {
      // 2 images side by side, equal height
      return "col-span-1 row-span-2";
    } else if (featuredImages.length === 1) {
      // 1 image full width/height
      return "col-span-2 row-span-2";
    }
    return "";
  };
  
  // Set a fixed height for the rows to control the aspect ratio of the large image
  // The large image (row-span-2) will be twice this height.
  const rowHeightClass = "auto-rows-[12rem] sm:auto-rows-[14rem] lg:auto-rows-[16rem]";


  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">Fotos</h2>
      
      {/* Featured Gallery Section (Max 3 images, using grid-cols-2) */}
      <div className={cn("grid grid-cols-2 gap-4", rowHeightClass)}>
        {featuredImages.map((image, index) => (
          <div
            key={image.id}
            className={cn(
              "relative overflow-hidden rounded-xl shadow-soft-md transition-transform duration-300 hover:scale-[1.02] cursor-pointer",
              featuredItemClasses(index)
            )}
          >
            <GalleryImage image={image} />
          </div>
        ))}
      </div>
      
      {/* Remaining Images Grid (Standard grid for the rest) */}
      {remainingImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
          {remainingImages.map((image) => (
            <div
              key={image.id}
              className="relative overflow-hidden rounded-xl shadow-soft-md aspect-video transition-transform duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <GalleryImage image={image} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantGallery;