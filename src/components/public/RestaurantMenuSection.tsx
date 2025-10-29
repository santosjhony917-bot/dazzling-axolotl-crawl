import React from 'react';
import { Menu, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePublicMenu } from '@/hooks/usePublicMenu';
import PublicMenuSection from './PublicMenuSection'; // Componente que renderiza a lista

interface RestaurantMenuSectionProps {
  id: string;
  restaurantId: string;
  isPremium: boolean;
}

const RestaurantMenuSection: React.FC<RestaurantMenuSectionProps> = ({ id, restaurantId, isPremium }) => {
  const { menuData, isLoading, error } = usePublicMenu(restaurantId);
  
  if (isLoading) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-sm text-gray-500 mt-2">Carregando cardápio...</p>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card id={id} className="shadow-soft-md border-none rounded-xl p-6 text-center bg-red-50 border-red-300">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 mt-2">Falha ao carregar o cardápio.</p>
      </Card>
    );
  }
  
  const categories = menuData?.categories || [];

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Menu className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-semibold text-primary">Nosso Cardápio</CardTitle>
        </div>
        {/* Botão Ver Tudo (Pode ser implementado para abrir um modal/página de menu completo) */}
        {categories.length > 0 && (
          <Button variant="link" className="text-highlight p-0 h-auto text-sm font-semibold">
            Ver Tudo
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <PublicMenuSection categories={categories} />
      </CardContent>
    </Card>
  );
};

export default RestaurantMenuSection;