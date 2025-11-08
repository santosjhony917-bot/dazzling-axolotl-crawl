"use client";

import React from "react";
import { PublicRestaurantData } from "@/types/restaurant"; // Agora importado corretamente
import RestaurantProfileHeader from "./RestaurantProfileHeader";
import RestaurantActionsBar from "./RestaurantActionsBar";
import RestaurantInfoSection from "./RestaurantInfoSection"; // Agora importado corretamente
import RestaurantMenuSection from "./RestaurantMenuSection"; // Agora importado corretamente
import RestaurantGallerySection from "./RestaurantGallerySection"; // Agora importado corretamente
import RestaurantSocialsSection from "./RestaurantSocialsSection"; // Agora importado corretamente
import RestaurantOrderSection from "./RestaurantOrderSection"; // Agora importado corretamente
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom"; // Substituído useRouter de next/navigation

interface PremiumProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
  restaurant,
  toggleFavorite,
  isFavoriteMutating,
  isCompact,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate(); // Usando useNavigate

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Confira o restaurante ${restaurant.name}!`,
        url: window.location.href,
      })
        .then(() => console.log('Compartilhado com sucesso'))
        .catch((error) => console.error('Erro ao compartilhar:', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "O link do restaurante foi copiado para a sua área de transferência.",
      });
    }
  };

  const handleBack = () => {
    navigate(-1); // Volta para a página anterior
  };

  return (
    <div className="relative">
      <RestaurantProfileHeader restaurant={restaurant} isCompact={isCompact} />
      <div className="relative bg-white rounded-t-3xl -mt-8 p-4 shadow-lg">
        <RestaurantActionsBar
          isFavorite={restaurant.is_favorite}
          onToggleFavorite={toggleFavorite}
          isFavoriteMutating={isFavoriteMutating}
          onShare={handleShare}
          // onBack={handleBack} // Removido, pois o botão "Voltar" foi removido do RestaurantActionsBar
          paddingClass="px-0 pt-0 pb-4"
        />
        <RestaurantInfoSection restaurant={restaurant} />
        <Separator className="my-4" />
        <RestaurantOrderSection restaurant={restaurant} />
        <Separator className="my-4" />
        <RestaurantMenuSection restaurant={restaurant} />
        {restaurant.gallery_images && restaurant.gallery_images.length > 0 && (
          <>
            <Separator className="my-4" />
            <RestaurantGallerySection restaurantId={restaurant.id} gallery_images={restaurant.gallery_images} /> {/* Passando gallery_images */}
          </>
        )}
        {restaurant.social_networks && restaurant.social_networks.length > 0 && (
          <>
            <Separator className="my-4" />
            <RestaurantSocialsSection restaurant={restaurant} />
          </>
        )}
      </div>
    </div>
  );
};

export default PremiumProfileLayout;