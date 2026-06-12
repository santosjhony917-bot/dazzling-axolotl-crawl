import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { GeocodedAddress } from '@/services/geolocation';
import { showError } from '@/utils/toast';

export interface UserSearchLocation {
  id: string | null;
  user_id: string | null;
  address: string;
  latitude: number;
  longitude: number;
  cep: string | null;
}

export const DEFAULT_LOCATION: UserSearchLocation = {
  id: null,
  user_id: null,
  address: "Av. Cabo Branco, 2000 - Cabo Branco, João Pessoa - PB",
  latitude: -7.1195,
  longitude: -34.8450,
  cep: '58038-000',
};

interface UserSearchLocationContextType {
  location: UserSearchLocation;
  isLoading: boolean;
  saveLocation: (addressData: GeocodedAddress) => Promise<{ error: string | null }>;
  refetch: () => void;
}

const UserSearchLocationContext = createContext<UserSearchLocationContextType | undefined>(undefined);

export const UserSearchLocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuthData();
  const [location, setLocation] = useState<UserSearchLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocation = useCallback(async (userId: string) => {
    setIsLoading(true);
    if (userId.startsWith('mock-')) {
      const saved = localStorage.getItem(`mock-search-location-${userId}`);
      if (saved) {
        try {
          setLocation(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing saved mock location:", e);
          setLocation({ ...DEFAULT_LOCATION, user_id: userId });
        }
      } else {
        setLocation({ ...DEFAULT_LOCATION, user_id: userId });
      }
      setIsLoading(false);
      return;
    }
    try {
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
          cep: data.cep,
        });
      } else {
        setLocation({ ...DEFAULT_LOCATION, user_id: userId });
      }
    } catch (e) {
      console.error("Error fetching user search location:", e);
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
        setIsLoading(false);
        setLocation(DEFAULT_LOCATION);
      }
    }
  }, [user, authLoading, fetchLocation]);

  const saveLocation = useCallback(async (addressData: GeocodedAddress) => {
    if (!user) {
      showError("Usuário não autenticado.");
      return { error: "Usuário não autenticado." };
    }
    
    setIsLoading(true);
    
    if (user.id.startsWith('mock-')) {
      const mockLoc = {
        id: 'mock-location-id',
        user_id: user.id,
        address: addressData.formattedAddress,
        latitude: addressData.lat,
        longitude: addressData.lon,
        cep: addressData.cep,
      };
      setLocation(mockLoc);
      localStorage.setItem(`mock-search-location-${user.id}`, JSON.stringify(mockLoc));
      setIsLoading(false);
      return { error: null };
    }
    
    const newLocationData = {
      user_id: user.id,
      address: addressData.formattedAddress,
      latitude: addressData.lat,
      longitude: addressData.lon,
      cep: addressData.cep,
    };

    try {
      const { data, error } = await supabase
        .from('user_search_locations')
        .upsert(newLocationData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      setLocation({
        id: data.id,
        user_id: data.user_id,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        cep: data.cep,
      });
      
      setIsLoading(false);
      return { error: null };
    } catch (e) {
      console.error("Error saving user search location:", e);
      setIsLoading(false);
      return { error: (e as Error).message };
    }
  }, [user]);

  const refetch = useCallback(() => {
    if (user) {
      fetchLocation(user.id);
    }
  }, [user, fetchLocation]);

  return (
    <UserSearchLocationContext.Provider value={{ location, isLoading, saveLocation, refetch }}>
      {children}
    </UserSearchLocationContext.Provider>
  );
};

export const useUserSearchLocationContext = () => {
  const context = useContext(UserSearchLocationContext);
  if (context === undefined) {
    throw new Error('useUserSearchLocationContext must be used within a UserSearchLocationProvider');
  }
  return context;
};
