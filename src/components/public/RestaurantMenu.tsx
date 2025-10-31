import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Utensils } from 'lucide-react';

interface RestaurantMenuProps {
  restaurantId: string;
  previewMode?: boolean;
}

export const RestaurantMenu: React.FC<RestaurantMenuProps> = ({ restaurantId, previewMode = false }) => {
  // Implementação de preview de menu
  if (!previewMode) return null;

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
        <Utensils className="w-6 h-6 mr-2 text-highlight" />
        Destaques do Cardápio
      </h2>
      
      <div className="space-y-6">
        <p className="text-gray-600">Conteúdo do menu em destaque...</p>
      </div>

      <div className="mt-6 text-center">
        <Link to={`/r/${restaurantId}/menu`}>
          <Button variant="outline" className="text-highlight border-highlight hover:bg-highlight/10">
            Ver Cardápio Completo
          </Button>
        </Link>
      </div>
    </div>
  );
};