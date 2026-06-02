"use client";

import React from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RestaurantPageHeaderProps {
  restaurantName?: string; // Opcional, caso queira exibir o nome no cabeçalho fixo
}

const RestaurantPageHeader: React.FC<RestaurantPageHeaderProps> = ({ restaurantName }) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-40 shadow-soft-md w-full max-w-md mx-auto">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="bg-white/50 backdrop-blur-sm rounded-full"
      >
        <ArrowLeft className="h-5 w-5 text-gray-800" />
      </Button>
      {restaurantName && <h2 className="text-lg font-semibold">{restaurantName}</h2>} {/* Opcional: exibir nome do restaurante */}
      <Button
        variant="ghost"
        size="icon"
        className="bg-white/50 backdrop-blur-sm rounded-full"
      >
        <Share2 className="h-5 w-5 text-gray-800" />
      </Button>
    </header>
  );
};

export default RestaurantPageHeader;