"use client";

import { Button } from "@/components/ui/button";
import { Share2, Heart, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
// import { useRouter } from "next/navigation"; // Removido

interface RestaurantActionsBarProps {
  onShare: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  isFavoriteMutating: boolean; // Adicionado
  paddingClass?: string;
  // onBack: () => void; // Removido, pois o botão "Voltar" foi removido
}

const RestaurantActionsBar = ({
  onShare,
  onToggleFavorite,
  isFavorite,
  isFavoriteMutating, // Adicionado
  paddingClass = "px-4 py-2",
  // onBack, // Removido
}: RestaurantActionsBarProps) => {
  // const router = useRouter(); // Removido

  return (
    <div className={cn("flex items-center justify-between w-full", paddingClass)}>
      {/* Botão Voltar (Removido) */}
      <div className="flex items-center space-x-2">
        {/* <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button> */}
        <Button variant="ghost" size="icon" onClick={onToggleFavorite} disabled={isFavoriteMutating}>
          <Heart className={cn("h-5 w-5", isFavorite ? "fill-red-500 text-red-500" : "text-gray-600")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShare}>
          <Share2 className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantActionsBar;