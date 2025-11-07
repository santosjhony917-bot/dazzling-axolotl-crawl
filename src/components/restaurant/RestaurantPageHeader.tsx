import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RestaurantPageHeaderProps {
  // Nenhuma propriedade específica necessária para este cabeçalho de navegação
}

const RestaurantPageHeader: React.FC<RestaurantPageHeaderProps> = () => {
  const navigate = useNavigate();

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: 'Confira este restaurante!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center h-16 px-4 bg-transparent"> {/* Fundo transparente */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="bg-white/50 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        className="bg-white/50 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white"
      >
        <Share2 className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default RestaurantPageHeader;