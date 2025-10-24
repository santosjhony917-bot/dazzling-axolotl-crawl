import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GeocodedAddress } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';

interface UserSearchLocation {
  address: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_LOCATION: UserSearchLocation = {
  address: "Localização não definida",
  latitude: 0,
  longitude: 0,
};

export const useUserSearchLocation = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserSearchLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocation = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_search_locations')
        .select('address, latitude, longitude')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means 'No rows found'
        throw error;
      }

      if (data) {
        setLocation({
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        });
      } else {
        setLocation(DEFAULT_LOCATION);
      }
    } catch (e) {
      console.error("Error fetching user search location:", e);
      showError("Falha ao carregar sua localização de busca.");
      setLocation(DEFAULT_LOCATION);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const saveLocation = useCallback(async (addressData: GeocodedAddress) => {
    if (!user?.id) {
      showError("Usuário não autenticado.");
      return false;
    }

    const newLocation: UserSearchLocation = {
      address: addressData.formattedAddress,
      latitude: addressData.lat,
      longitude: addressData.lon,
    };

    try {
      // Check if location already exists (to decide between insert or update)
      const { data: existing } = await supabase
        .from('user_search_locations')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let updateError;
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('user_search_locations')
          .update(newLocation)
          .eq('user_id', user.id);
        updateError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_search_locations')
          .insert({ ...newLocation, user_id: user.id });
        updateError = error;
      }

      if (updateError) {
        throw updateError;
      }

      setLocation(newLocation);
      showSuccess("Localização de busca salva com sucesso!");
      return true;

    } catch (e) {
      console.error("Error saving user search location:", e);
      showError("Falha ao salvar a localização de busca.");
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, isLoading, saveLocation, refetch: fetchLocation };
};