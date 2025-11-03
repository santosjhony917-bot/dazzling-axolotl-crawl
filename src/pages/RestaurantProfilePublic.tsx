"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { useAuthData } from '@/context/AuthContext';

const RestaurantProfilePublic = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteMutating, setIsFavoriteMutating] = useState(false);
  const { user } = useAuthData();

  useEffect(() => {
    if (!id) {
      setError("ID do restaurante não fornecido.");
      setLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
        setRestaurant(null);
      } else {
        setRestaurant(data as PublicRestaurantData);
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

        if (data) {
          setIsFavorite(true);
        } else {
          setIsFavorite(false);
        }
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error checking favorite:", error);
        }
      } else {
        setIsFavorite(false);
      }
    };

    checkFavorite();
  }, [user, restaurant]);

  const toggleFavorite = async () => {
    if (!user) {
      // Redirect to login or show a message
      console.log("User not logged in. Cannot favorite.");
      return;
    }

    if (!restaurant) return;

    setIsFavoriteMutating(true);
    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);

      if (error) {
        console.error("Error removing favorite:", error);
      } else {
        setIsFavorite(false);
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        console.error("Error adding favorite:", error);
      } else {
        setIsFavorite(true);
      }
    }
    setIsFavoriteMutating(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Erro: {error}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center min-h-screen">Restaurante não encontrado.</div>;
  }

  const planToRender = restaurant.plan; // Assuming 'plan' is a property of PublicRestaurantData

  const layoutProps = {
    restaurant: restaurant,
    toggleFavorite: toggleFavorite,
    isFavoriteMutating: isFavoriteMutating,
    isCompact: false, // You can adjust this based on your needs
  };

  return (
    <>
      {planToRender === 'premium' || planToRender === 'premium_gift' ? (
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </>
  );
};

export default RestaurantProfilePublic;