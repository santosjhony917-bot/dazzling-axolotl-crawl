"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMenuItemById } from '@/integrations/supabase/restaurant';
import { MenuItem, Restaurant } from '@/types'; // Importando de '@/types'
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function MenuItemDetails() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const { data: menuItem, isLoading, error } = useQuery<MenuItem | null>({
    queryKey: ['menuItem', itemId],
    queryFn: () => (itemId ? fetchMenuItemById(itemId) : Promise.resolve(null)),
    enabled: !!itemId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">Erro ao carregar item do menu.</div>;
  }

  if (!menuItem) {
    return <div className="text-center text-muted-foreground">Item do menu não encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <Card>
        <img
          src={menuItem.image_url || PLACEHOLDER_IMAGE_URL}
          alt={menuItem.name}
          className="w-full h-64 object-cover rounded-t-lg"
        />
        <CardContent className="p-4">
          <h1 className="text-3xl font-bold mb-2">{menuItem.name}</h1>
          {menuItem.description && (
            <p className="text-muted-foreground mb-4">{menuItem.description}</p>
          )}
          <p className="text-2xl font-bold text-primary">R$ {menuItem.price.toFixed(2)}</p>
          {/* Adicionar botão de adicionar ao carrinho ou outras ações aqui */}
        </CardContent>
      </Card>
    </div>
  );
}