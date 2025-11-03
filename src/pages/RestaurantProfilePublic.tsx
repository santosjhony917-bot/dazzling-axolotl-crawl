"use client";

import React from 'react';
import { useParams } from 'react-router-dom';
import usePublicRestaurant from '@/hooks/usePublicRestaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const RestaurantProfilePublic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { restaurant, isLoading, error, toggleFavorite, isFavoriteMutating } = usePublicRestaurant(id);
  const isCompact = useMediaQuery("(max-width: 768px)"); // Define o breakpoint para modo compacto

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        <p>Erro ao carregar o restaurante ou restaurante não encontrado.</p>
      </div>
    );
  }

  const layoutProps = {
    restaurant,
    toggleFavorite,
    isFavoriteMutating,
    isCompact,
  };

  const planToRender = restaurant.plan;

  return (
    <>
      <Helmet>
        <title>{restaurant.name} - Cardápio Online</title>
        <meta name="description" content={restaurant.description || `Confira o cardápio e informações de ${restaurant.name}.`} />
        <meta property="og:title" content={`${restaurant.name} - Cardápio Online`} />
        <meta property="og:description" content={restaurant.description || `Confira o cardápio e informações de ${restaurant.name}.`} />
        {restaurant.image_url && <meta property="og:image" content={restaurant.image_url} />}
        <meta property="og:type" content="restaurant.menu" />
        {/* Adicione outras meta tags conforme necessário */}
      </Helmet>

      {planToRender === 'premium' || planToRender === 'premium_gift' ? ( // Incluindo 'premium_gift'
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </>
  );
};

export default RestaurantProfilePublic;