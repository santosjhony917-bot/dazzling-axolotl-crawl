import React from 'react';
import { Heart, MapPin, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RestaurantProfileHeaderProps {
  restaurant: {
    id: string;
    name: string;
    coverImageUrl: string;
    isPremium: boolean;
    isCompact?: boolean; // NOVO: Prop para modo compacto
  };
  onBack?: () => void; // Adicionar prop onBack
}

const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
  onBack,
}) => {
  const {
    name,
    coverImageUrl,
    isPremium,
    isCompact = false, // Valor padrão
  } = restaurant;

  const navigate = useNavigate();

  const handleBack = onBack || (() => navigate(-1));

  // Classes condicionais para altura da capa
  const coverHeightClasses = isCompact ? "h-36 md:h-40" : "h-40 md:h-48"; // Reduzido em ~25%

  return (
    <div className={cn("relative w-full bg-gray-200 overflow-hidden", coverHeightClasses)}>
      {/* Imagem de Capa - Exibe se coverImageUrl existir, independentemente do plano */}
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        // Placeholder se não houver imagem de capa
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Utensils className="w-24 h-24 text-gray-300" />
        </div>
      )}

      {/* Botão Voltar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className={cn(
          "absolute top-4 left-4 z-50 bg-white/80 backdrop-blur-sm rounded-full shadow-md",
          isCompact && "top-2 left-2 h-8 w-8"
        )}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default RestaurantProfileHeader;