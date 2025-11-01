"use client";

import { PublicRestaurantData } from "@/types/supabase";
import React from "react";
import { GalleryImage } from "@/types/supabase";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "../ui/skeleton";

interface GallerySectionProps {
  restaurantId: string;
}

const fetchGallery = async (restaurantId: string): Promise<GalleryImage[]> => {
  const { data, error } = await supabase
    .from("restaurant_gallery")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data;
};

const GallerySection: React.FC<GallerySectionProps> = ({ restaurantId }) => {
  const { data: gallery, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["restaurantGallery", restaurantId],
    queryFn: () => fetchGallery(restaurantId),
  });

  if (isLoading) {
    return (
      <section className="p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">Galeria</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </section>
    );
  }

  if (!gallery || gallery.length === 0) {
    return null;
  }

  return (
    <section className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Galeria</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {gallery.map((image) => (
          <div key={image.id} className="relative overflow-hidden rounded-lg aspect-square">
            <img
              src={image.image_url}
              alt={image.caption || "Imagem da galeria"}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            />
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 text-white text-xs truncate">
                {image.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default GallerySection;