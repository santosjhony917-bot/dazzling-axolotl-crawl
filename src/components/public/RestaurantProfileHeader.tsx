"use client";

import React from 'react';
import { Utensils, ArrowLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl?: string | null;
    isPremium: boolean;
    isCompact: boolean;
  };
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({ restaurant }) => {
  const navigate = useNavigate();
  const { coverImageUrl, isPremium, isCompact, name } = restaurant;

  return (
    <div className={cn("relative w-full", isCompact || !isPremium ? "h-24" : "h-48")}> {/* Ajustado para manter altura para botões em planos free */}
      {isPremium && ( // Renderiza a capa apenas se for premium
        coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          // Placeholder se não houver imagem de capa, mas apenas para premium
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Utensils className="w-24 h-24 text-gray-300" />
          </div>
        )
      )}

      {/* Overlay content like back button, share button */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-white/50 backdrop-blur-sm rounded-full">
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </Button>
        <Button variant="ghost" size="icon" className="bg-white/50 backdrop-blur-sm rounded-full">
          <Share2 className="h-5 w-5 text-gray-800" />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantProfileHeader;