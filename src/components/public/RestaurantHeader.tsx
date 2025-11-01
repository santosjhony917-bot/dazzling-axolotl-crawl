import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestaurantHeaderProps {
  name: string;
  coverImageUrl?: string | null;
  imageUrl?: string | null;
  isOwner: boolean;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  name,
  coverImageUrl,
  imageUrl,
  isOwner,
}) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="relative h-48 sm:h-64 bg-gray-200">
      {/* Cover Image */}
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt={`Capa de ${name}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
          <span className="text-xl text-gray-600">Sem Imagem de Capa</span>
        </div>
      )}

      {/* Avatar/Logo */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
        <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
          <AvatarImage src={imageUrl || undefined} alt={`Logo de ${name}`} />
          <AvatarFallback className="text-3xl font-semibold bg-primary text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isOwner && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full"
            aria-label="Editar logo"
          >
            <Camera className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
};

export default RestaurantHeader;