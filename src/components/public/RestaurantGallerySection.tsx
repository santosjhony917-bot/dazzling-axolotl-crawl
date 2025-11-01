"use client";

import React from 'react';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay'; // Componente que renderiza a galeria
import { GalleryImage } from '@/types/supabase'; // Importando o tipo correto

interface RestaurantGallerySectionProps {
  galleryImages: GalleryImage[];
}

const RestaurantGallerySection: React.FC<RestaurantGallerySectionProps> = ({ galleryImages }) => {
  if (galleryImages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Nenhuma imagem na galeria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-[#022D68] mb-4">Galeria</h2>
      <PhotoGalleryDisplay images={galleryImages} />
    </div>
  );
};

export default RestaurantGallerySection;