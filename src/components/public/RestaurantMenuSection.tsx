import React from 'react';
import { Menu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RestaurantMenuSectionProps {
  id: string;
  restaurantId: string;
  isPremium: boolean;
}

const RestaurantMenuSection: React.FC<RestaurantMenuSectionProps> = ({ id, restaurantId, isPremium }) => {
  // NOTE: Implementação futura para buscar e exibir categorias e itens do menu
  
  return (
    <Card id={id} className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Menu className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-semibold">Nosso Cardápio</CardTitle>
        </div>
        <Button variant="link" className="text-primary">Ver Tudo</Button>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-gray-500">O cardápio será carregado aqui.</p>
        {/* Placeholder para lista de categorias/itens */}
      </CardContent>
    </Card>
  );
};

export default RestaurantMenuSection;