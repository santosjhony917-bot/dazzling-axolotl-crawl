"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, PublicRestaurantData } from '@/types'; // Importando os tipos
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import { useAuth } from '@/lib/auth'; // Assumindo que você tem um hook de autenticação
import { toast } from 'sonner'; // Para notificações

const RestaurantProfilePublic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const { user } = useAuth(); // Obter o usuário logado

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) {
        setError('ID do restaurante não fornecido.');
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
        toast.error(`Erro ao carregar restaurante: ${error.message}`);
      } else {
        setRestaurant(data);
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [id]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (user && restaurant) {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error checking favorite:', error);
        }
        setIsFavorite(!!data);
      }
    };
    checkFavorite();
  }, [user, restaurant]);

  const toggleFollow = async () => {
    if (!user) {
      toast.info('Você precisa estar logado para favoritar um restaurante.');
      // Redirecionar para login ou mostrar modal de login
      return;
    }

    if (!restaurant) return;

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);

      if (error) {
        toast.error('Erro ao remover dos favoritos.');
        console.error('Error unfavoriting:', error);
      } else {
        setIsFavorite(false);
        toast.success('Restaurante removido dos favoritos!');
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        toast.error('Erro ao adicionar aos favoritos.');
        console.error('Error favoriting:', error);
      } else {
        setIsFavorite(true);
        toast.success('Restaurante adicionado aos favoritos!');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share && restaurant) {
      navigator.share({
        title: restaurant.name || 'Restaurante',
        text: `Confira este restaurante: ${restaurant.name}`,
        url: window.location.href,
      }).catch((error) => console.error('Error sharing:', error));
    } else {
      // Fallback para navegadores que não suportam a API Web Share
      navigator.clipboard.writeText(window.location.href);
      toast.info('Link copiado para a área de transferência!');
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Erro: {error}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center h-screen">Restaurante não encontrado.</div>;
  }

  // Transformar o objeto restaurant para PublicRestaurantData
  const publicRestaurantData: PublicRestaurantData = {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    logoUrl: restaurant.image_url,
    coverImageUrl: restaurant.cover_image_url,
    plan: restaurant.plan,
    category: restaurant.category,
    address: restaurant.address,
    city: restaurant.city,
    state: restaurant.state,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    opening_hours: restaurant.opening_hours,
    whatsapp_url: restaurant.whatsapp_url,
    ifood_url: restaurant.ifood_url,
    other_url: restaurant.other_url,
    other_url_label: restaurant.other_url_label,
    payment_methods: restaurant.payment_methods,
    social_networks: restaurant.social_networks,
    addressSummary: `${restaurant.address || ''}${restaurant.number ? `, ${restaurant.number}` : ''}${restaurant.neighborhood ? ` - ${restaurant.neighborhood}` : ''}${restaurant.city ? `, ${restaurant.city}` : ''}${restaurant.state ? `/${restaurant.state}` : ''}`,
    followers_count: restaurant.followers_override || 0, // Usar followers_override ou 0
    menu_categories: [], // Placeholder, pode ser carregado separadamente
    isPremium: restaurant.plan === 'premium',
  };

  return (
    <>
      {publicRestaurantData.isPremium ? (
        <PremiumProfileLayout
          restaurant={publicRestaurantData}
          onBack={handleBack}
          onToggleFavorite={toggleFollow}
          onShare={handleShare}
          isFavorite={isFavorite}
        />
      ) : (
        <FreeProfileLayout
          restaurant={publicRestaurantData}
          onBack={handleBack}
          onToggleFavorite={toggleFollow}
          onShare={handleShare}
          isFavorite={isFavorite}
        />
      )}
    </>
  );
};

export default RestaurantProfilePublic;