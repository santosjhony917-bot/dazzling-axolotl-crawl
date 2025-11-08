import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RestaurantPageHeaderProps {
  restaurantName: string;
  isFavorited: boolean;
  onFavoriteToggle: () => void;
  isFavoriteLoading: boolean;
}

const RestaurantPageHeader: React.FC<RestaurantPageHeaderProps> = ({
  restaurantName,
  isFavorited,
  onFavoriteToggle,
  isFavoriteLoading,
}) => {
  const navigate = useNavigate();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurantName,
          text: `Confira o cardápio de ${restaurantName}!`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      // Fallback para copiar para a área de transferência
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-40">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="bg-black/30 text-white hover:bg-black/50 rounded-full"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onFavoriteToggle}
          disabled={isFavoriteLoading}
          className="bg-black/30 text-white hover:bg-black/50 rounded-full"
        >
          <Heart
            className={cn('h-6 w-6 transition-colors', isFavorited ? 'fill-red-500 text-red-500' : 'text-white')}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="bg-black/30 text-white hover:bg-black/50 rounded-full"
        >
          <Share2 className="h-6 w-6" />
        </Button>
      </div>
    </header>
  );
};

export default RestaurantPageHeader;