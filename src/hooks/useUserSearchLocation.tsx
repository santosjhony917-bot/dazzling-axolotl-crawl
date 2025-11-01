"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { UserSearchLocation } from '@/types/user'; // Assuming this type exists

const DEFAULT_LOCATION: UserSearchLocation = {
  address: 'São Paulo, SP, Brasil',
  latitude: -23.55052,
  longitude: -46.633309,
  cep: '01000-000',
};

export function useUserSearchLocation() {
  const { user, isProfileLoading: authLoading } = useAuthData();
  const [location, setLocation] = useState<UserSearchLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndSetLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (user) {
      const { data, error: fetchError } = await supabase
        .from('user_search_locations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user location:', fetchError);
        setError('Erro ao carregar sua última localização.');
      }

      if (data) {
        setLocation(data);
        setIsLoading(false);
        return;
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation: UserSearchLocation = {
            address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
            latitude,
            longitude,
          };
          setLocation(newLocation);

          if (user) {
            const { error: insertError } = await supabase
              .from('user_search_locations')
              .insert({ user_id: user.id, ...newLocation });
            if (insertError) {
              console.error('Error saving user location:', insertError);
            }
          }
          setIsLoading(false);
        },
        (geoError) => {
          console.error('Error getting geolocation:', geoError);
          setError('Não foi possível obter sua localização atual. Usando localização padrão.');
          setLocation(DEFAULT_LOCATION);
          setIsLoading(false);
        }
      );
    } else {
      setError('Geolocalização não suportada. Usando localização padrão.');
      setLocation(DEFAULT_LOCATION);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchAndSetLocation();
    }
  }, [user, authLoading, fetchAndSetLocation]);

  const saveLocation = useCallback(async (newLocation: UserSearchLocation) => {
    if (!user) {
      setError('Usuário não autenticado para salvar localização.');
      return;
    }
    setIsLoading(true);
    const { error: insertError } = await supabase
      .from('user_search_locations')
      .insert({ user_id: user.id, ...newLocation });
    if (insertError) {
      console.error('Error saving user location:', insertError);
      setError('Erro ao salvar localização.');
    } else {
      setLocation(newLocation);
      setError(null);
    }
    setIsLoading(false);
  }, [user]);

  const refetch = useCallback(() => {
    fetchAndSetLocation();
  }, [fetchAndSetLocation]);

  return { location, isLoading, error, saveLocation, refetch };
}