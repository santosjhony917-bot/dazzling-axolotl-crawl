import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import RestaurantMenu from '@/components/public/RestaurantMenu';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicRestaurantData } from '@/types/restaurant'; // Importar PublicRestaurantData

export default function FullMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { restaurant, isLoading, error } = usePublicRestaurant(restaurantId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-highlight" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p className="text-xl font-semibold">Erro ao carregar cardápio.</p>
        <p className="mt-2">{error.message}</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center p-8 text-gray-600">
        <p className="text-xl font-semibold">Restaurante não encontrado.</p>
        <p className="mt-2">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;

  return (
    <div className="relative min-h-screen bg-gray-50 pb-20 md:max-w-md md:mx-auto">
      {/* Header Fixo */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-[calc(100%-120px)]">Cardápio Completo</h1>
          <div className="w-10" /> {/* Espaçador para alinhar o título */}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {hasMenu ? (
          <RestaurantMenu 
            menuCategories={restaurant.menu_categories}
            isFullMenuPage={true} // Nova prop para indicar que é a página completa
          />
        ) : (
          <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-soft-md">
            <p className="text-xl font-semibold">Nenhum item de menu disponível.</p>
            <p className="mt-2">O restaurante ainda não adicionou itens ao seu cardápio.</p>
          </div>
        )}
      </div>
    </div>
  );
}