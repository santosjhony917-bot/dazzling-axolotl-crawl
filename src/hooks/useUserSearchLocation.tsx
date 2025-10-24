import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { GeocodedAddress, reverseGeocode } from '@/services/geolocation';
import { showError } from '@/utils/toast';

interface UserSearchLocation {
  id: string | null;
  user_id: string | null;
  address: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_LOCATION: UserSearchLocation = {
  id: null,
  user_id: null,
  address: "Localização Padrão (João Pessoa)",
  latitude: -7.1195,
  longitude: -34.8450,
};

export function useUserSearchLocation() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useState<UserSearchLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocation = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // 1. Tenta buscar a última localização salva pelo usuário
      const { data, error } = await supabase
        .from('user_search_locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: No rows found
        throw new Error(error.message);
      }

      if (data) {
        setLocation({
          id: data.id,
          user_id: data.user_id,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        });
      } else {
        // 2. Se não houver localização salva, usa o padrão
        setLocation({ ...DEFAULT_LOCATION, user_id: userId });
      }
    } catch (e) {
      console.error("Error fetching user search location:", e);
      showError("Falha ao carregar localização de busca.");
      setLocation({ ...DEFAULT_LOCATION, user_id: userId });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchLocation(user.id);
      } else {
        // Não logado, usa a localização padrão
        setIsLoading(false);
        setLocation(DEFAULT_LOCATION);
      }
    }
  }, [user, authLoading, fetchLocation]);

  const saveLocation = useCallback(async (addressData: GeocodedAddress) => {
    if (!user) {
      showError("Usuário não autenticado.");
      return;
    }
    
    setIsLoading(true);
    
    const newLocationData = {
      user_id: user.id,
      address: addressData.formattedAddress,
      latitude: addressData.lat,
      longitude: addressData.lon,
    };

    try {
      // Sempre insere um novo registro para manter o histórico (se necessário) ou
      // faz um upsert se quisermos apenas o último. Para simplicidade e histórico, vamos inserir.
      const { data, error } = await supabase
        .from('user_search_locations')
        .insert([newLocationData])
        .select()
        .single();

      if (error) throw error;

      setLocation({
        id: data.id,
        user_id: data.user_id,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      
      setIsLoading(false);
      return { error: null };

    } catch (e) {
      console.error("Error saving user search location:", e);
      setIsLoading(false);
      return { error: (e as Error).message };
    }
  }, [user]);

  return {
    location,
    isLoading,
    saveLocation,
    refetch: () => user && fetchLocation(user.id),
  };
}