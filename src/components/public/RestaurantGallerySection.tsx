"use client";

import React from "react";
import { PublicRestaurantData } from "@/types/restaurant";
import { GalleryImage } from "@/types/supabase";

interface RestaurantGallerySectionProps {
  restaurantId: string;
  gallery_images: GalleryImage[];
}

const RestaurantGallerySection: React.FC<RestaurantGallerySectionProps> = ({ restaurantId, gallery_images }) => {
  if (!gallery_images || gallery_images.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Galeria</h2>
      <div className="grid grid-cols-2 gap-4">
        {gallery_images.map((item) => (
          <img key={item.id} src={item.image_url} alt={item.caption || "Imagem da galeria"} className="w-full h-32 object-cover rounded-lg" />
        ))}
      </div>
    </div>
  );
};

export default RestaurantGallerySection;