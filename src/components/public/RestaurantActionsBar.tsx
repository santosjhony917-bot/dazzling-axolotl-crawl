"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Share2 } from "lucide-react";

interface RestaurantActionsBarProps {
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  isFavorite: boolean;
  isCompact?: boolean; // Adicionado
}

export function RestaurantActionsBar({
  onBack,
  onToggleFavorite,
  onShare,
  isFavorite,
  isCompact, // Adicionado
}: RestaurantActionsBarProps) {
  return (
    <div className="w-full bg-white shadow-sm z-10">
      <div className="relative max-w-md mx-auto flex items-center justify-between px-4 py-2">
        {/* Botão Voltar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </div>

        {/* Espaçador para empurrar os botões de ação para a direita */}
        <div className="flex-grow"></div>

        {/* Botões de Ação */}
        <div className="flex items-center space-x-2 absolute right-4 top-1/2 -translate-y-1/2">
          <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
            {isFavorite ? <Heart fill="red" className="h-6 w-6 text-red-500" /> : <Heart className="h-6 w-6" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onShare}>
            <Share2 className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}