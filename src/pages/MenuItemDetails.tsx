"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMenuItemById } from '@/integrations/supabase/restaurants';
import { MenuItem, Restaurant } from '@/types/supabase'; // Importando tipos corretos
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { showError } from '@/utils/toast';

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();

  const { data: menuItem, isLoading, error } = useQuery<MenuItem | null, Error>({
    queryKey: ['menuItem', itemId],
    queryFn: () => fetchMenuItemById(itemId!),
    enabled: !!itemId,
  });

  const { isFavorite, toggleFavorite } = useMenuItemFavorites(itemId || '');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    showError('Erro ao carregar detalhes do item do menu.');
    return (
      <div className="text-center text-red-500 py-8">
        <p>Não foi possível carregar os detalhes do item. Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  if (!menuItem) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Item do menu não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <img
          src={menuItem.image_url || PLACEHOLDER_IMAGE_URL}
          alt={menuItem.name}
          className="w-full h-64 object-cover"
        />
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-[#022D68]">{menuItem.name}</h1>
            <Button variant="ghost" size="icon" onClick={toggleFavorite}>
              <Heart className={`h-7 w-7 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </Button>
          </div>
          {menuItem.description && (
            <p className="text-gray-700 mb-4">{menuItem.description}</p>
          )}
          <p className="text-2xl font-bold text-[#E47948] mb-4">R$ {menuItem.price.toFixed(2)}</p>
          {/* Adicionar botão de "Adicionar ao Carrinho" ou "Pedir" aqui */}
          <Button className="w-full bg-[#E47948] hover:bg-[#C2653B] text-white font-bold py-2 px-4 rounded">
            Adicionar ao Pedido
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemDetails;