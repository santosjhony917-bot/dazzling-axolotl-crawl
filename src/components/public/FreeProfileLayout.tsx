"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import { RestaurantAddressHoursSection } from './RestaurantAddressHoursSection';
import RestaurantGallery from './RestaurantGallery'; // Ajustado para importação padrão
import RestaurantMenu from './RestaurantMenu'; // Ajustado para importação padrão
import RestaurantInfo from './RestaurantInfo'; // Ajustado para importação padrão
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const FreeProfileLayout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) {
        setError("ID do restaurante não fornecido.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
        toast.error("Erro ao carregar restaurante: " + error.message);
      } else {
        setRestaurant(data);
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 mt-8">Erro: {error}</div>;
  }

  if (!restaurant) {
    return <div className="text-center text-gray-500 mt-8">Restaurante não encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="relative h-48 bg-gray-200 rounded-lg overflow-hidden mb-4">
        {restaurant.cover_image_url && (
          <img src={restaurant.cover_image_url} alt="Capa do Restaurante" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white text-center">{restaurant.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <RestaurantAddressHoursSection restaurant={restaurant} />
          <RestaurantMenu restaurantId={restaurant.id} />
        </div>
        <div className="md:col-span-1 space-y-4">
          <RestaurantInfo restaurant={restaurant} />
          <RestaurantGallery restaurantId={restaurant.id} />
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary-dark text-white">
          Voltar para a página inicial
        </Button>
      </div>
    </div>
  );
};