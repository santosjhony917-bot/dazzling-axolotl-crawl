import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pizza, Heart, Loader2, ArrowLeft, Utensils, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { useAuthData } from '@/context/AuthContext';
import { cn, formatPrice } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { useQuery } from '@tanstack/react-query';
import { fetchMenuItemById } from '@/integrations/supabase/restaurant';
import { MenuItem, Restaurant } from '@/types/supabase';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

// Tipo de dado esperado após o fetch
type DetailedMenuItem = (MenuItem & { restaurant: Restaurant | null });

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData();
  
  if (!itemId) {
    // Se o ID estiver faltando na URL, redireciona imediatamente
    useEffect(() => {
      showError("ID do item não encontrado.");
      navigate(-1);
    }, [navigate]);
    return null;
  }

  // Query para buscar os detalhes do item
  const { data: itemData, isLoading, error } = useQuery<DetailedMenuItem | null, Error>({
    queryKey: ['menuItemDetails', itemId],
    queryFn: () => fetchMenuItemById(itemId),
    enabled: !!itemId,
    staleTime: 1000 * 60 * 5,
  });
  
  // Usando o hook de favoritos
  const { isFavorite, toggleFavorite, isLoading: isFavoriteMutating } = useMenuItemFavorites(itemId);
  
  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !itemData) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Prato Não Encontrado</h2>
        <p className="text-gray-600 mb-6">O item de menu solicitado não existe ou foi removido.</p>
        <Button onClick={handleBack}>
          Voltar
        </Button>
      </div>
    );
  }
  
  const restaurantName = itemData.restaurant?.name || 'Restaurante Desconhecido';
  const restaurantId = itemData.restaurant?.id;

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      
      {/* Header Fixo */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#022D68] text-xl font-bold">Detalhes do Prato</h2>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-6">
        <Card className="shadow-soft-xl border-none rounded-2xl bg-white p-0 overflow-hidden">
          
          {/* Imagem do Prato */}
          <div className="h-64 w-full bg-gray-200 relative">
            <img 
              src={itemData.image_url || PLACEHOLDER_IMAGE_URL} 
              alt={itemData.name} 
              className="w-full h-full object-cover"
            />
            
            {/* Botão de Favoritar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              disabled={!isAuthenticated || isFavoriteMutating}
              className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-soft-md bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              ) : (
                <Heart 
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isFavorite ? "text-red-500 fill-red-500" : "text-gray-500 hover:text-red-500"
                  )}
                />
              )}
            </Button>
          </div>

          <CardContent className="p-6 space-y-4">
            <h1 className="text-3xl font-extrabold text-primary">{itemData.name}</h1>
            
            <p className="text-4xl font-extrabold text-highlight">
              {formatPrice(itemData.price)}
            </p>
            
            {itemData.description && (
              <p className="text-gray-700 text-base leading-relaxed">
                {itemData.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-gray-600">
              <Utensils className="w-5 h-5 text-primary" />
              <p className="font-semibold">Servido por: {restaurantName}</p>
            </div>
            
            {restaurantId && (
              <Button 
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurantId }))}
                variant="outline"
                className="w-full h-12 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5"
              >
                Ver Restaurante
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MenuItemDetails;