import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Utensils } from 'lucide-react';

const MainProfileCard: React.FC = () => {
  // Mock data for demonstration
  const restaurantName = "Meu Restaurante Incrível";
  const imageUrl = "https://via.placeholder.com/150";

  return (
    <Card className="p-4 flex items-center space-x-4 shadow-lg">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={restaurantName} 
          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Utensils className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold">{restaurantName}</h2>
        <p className="text-sm text-gray-500">Área de Gerenciamento de Perfil</p>
      </div>
    </Card>
  );
};

export default MainProfileCard;