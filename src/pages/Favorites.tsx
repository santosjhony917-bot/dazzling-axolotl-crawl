"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, FavoriteRestaurant } from '@/types'; // Importando de '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { Link } from 'react-router-dom';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

export default function Favorites() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { favoriteRestaurants, isLoading: isLoadingFavorites, removeFavorite } = useFavorites(user?.id);

  if (isLoadingAuth || isLoadingFavorites) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center p-4">Por favor, faça login para ver seus favoritos.</div>;
  }

  if (!favoriteRestaurants || favoriteRestaurants.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Você ainda não adicionou nenhum restaurante aos favoritos.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Meus Favoritos</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteRestaurants.map((fav) => (
          <Card key={fav.id} className="relative">
            <Link to={`/restaurant/${fav.restaurants.id}`}>
              <img
                src={fav.restaurants.image_url || PLACEHOLDER_IMAGE_URL}
                alt={fav.restaurants.name}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <CardHeader>
                <CardTitle className="text-lg">{fav.restaurants.name}</CardTitle>
              </CardHeader>
            </Link>
            <CardContent>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-red-500 hover:text-red-600"
                onClick={() => removeFavorite(fav.restaurants.id)}
              >
                <Heart fill="currentColor" />
              </Button>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {fav.restaurants.description || 'Sem descrição.'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}