"use client";

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ArrowLeft } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { cn, formatCurrency } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { toast } from 'sonner';

const MenuItemDetails = () => {
  const { restaurantId, itemId } = useParams<{ restaurantId: string; itemId: string }>();
  const { user } = useAuthData(); // Corrigido: usando 'user' diretamente
  const queryClient = useQueryClient();

  const { data: menuItem, isLoading, error } = useQuery({
    queryKey: ['menuItem', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          menu_categories (
            restaurant_id
          )
        `)
        .eq('id', itemId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: isFavorite, isLoading: isLoadingFavorite } = useQuery({
    queryKey: ['menuItemFavorite', itemId, user?.id], // Corrigido: usando 'user?.id'
    queryFn: async () => {
      if (!user?.id) return false; // Corrigido: usando 'user?.id'
      const { data, error } = await supabase
        .from('menu_item_favorites')
        .select('id')
        .eq('user_id', user.id) // Corrigido: usando 'user.id'
        .eq('menu_item_id', itemId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows found
      return !!data;
    },
    enabled: !!user?.id, // Corrigido: usando 'user?.id'
  });

  const { mutate: toggleFavorite, isPending: isFavoriteMutating } = useMutation({
    mutationFn: async () => {
      if (!user?.id) { // Corrigido: usando 'user?.id'
        showError('Você precisa estar logado para favoritar itens.');
        return;
      }
      if (isFavorite) {
        const { error } = await supabase
          .from('menu_item_favorites')
          .delete()
          .eq('user_id', user.id) // Corrigido: usando 'user.id'
          .eq('menu_item_id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('menu_item_favorites')
          .insert({ user_id: user.id, menu_item_id: itemId }); // Corrigido: usando 'user.id'
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItemFavorite', itemId, user?.id] }); // Corrigido: usando 'user?.id'
      toast.success(isFavorite ? 'Item removido dos favoritos!' : 'Item adicionado aos favoritos!');
    },
    onError: (err) => {
      showError(`Erro ao atualizar favoritos: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light p-4">
        <Skeleton className="h-64 w-full rounded-lg mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (error || !menuItem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <p className="text-red-500">Erro ao carregar os detalhes do item do menu.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light pb-16">
      <div className="relative h-64 w-full bg-gray-200">
        {menuItem.image_url && (
          <img
            src={menuItem.image_url}
            alt={menuItem.name}
            className="h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <Link to={`/restaurants/${restaurantId}/menu`} className="absolute top-4 left-4 text-white bg-black/50 rounded-full p-2">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        {user?.id && ( // Corrigido: usando 'user?.id'
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => toggleFavorite()}
            disabled={isFavoriteMutating || isLoadingFavorite}
          >
            <Heart className={cn("h-6 w-6", isFavorite && "fill-red-500 text-red-500")} />
          </Button>
        )}
      </div>

      <Card className="relative -mt-12 mx-4 shadow-lg rounded-lg">
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{menuItem.name}</h1>
          <p className="text-2xl font-semibold text-orange-600 mb-4">{formatCurrency(menuItem.price)}</p>
          {menuItem.description && (
            <p className="text-gray-700 leading-relaxed">{menuItem.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Add to cart or other actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
        <Button className="w-full bg-primary text-white text-lg py-6">
          Adicionar ao Pedido
        </Button>
      </div>
    </div>
  );
};

export default MenuItemDetails;