"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2 } from 'lucide-react';

interface RestaurantPageHeaderProps {
  // Este componente agora é apenas para os botões, o posicionamento é feito pelo pai.
}

const RestaurantPageHeader: React.FC<RestaurantPageHeaderProps> = () => {
  const navigate = useNavigate();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch((error) => console.error('Error sharing:', error));
    } else {
      // Fallback para navegadores que não suportam a Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copiado para a área de transferência!'))
        .catch((error) => console.error('Error copying link:', error));
    }
  };

  return (
    <div className="flex items-center justify-between p-4 pb-2 w-full">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="bg-white/50 backdrop-blur-sm rounded-full"
      >
        <ArrowLeft className="h-5 w-5 text-gray-800" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        className="bg-white/50 backdrop-blur-sm rounded-full"
      >
        <Share2 className="h-5 w-5 text-gray-800" />
      </Button>
    </div>
  );
};

export default RestaurantPageHeader;