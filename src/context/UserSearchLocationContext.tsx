import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { GeocodedAddress } from '@/services/geolocation';
import { showError } from '@/utils/toast';

export interface UserSearchLocation {
  id: string | null;
  user_id: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  cep: string | null;
}

export type UserSearchLocationSource = 'none' | 'saved' | 'manual' | 'gps' | 'demo';
export type UserSearchLocationStatus = 'loading' | 'ready' | 'missing' | 'error';

export const EMPTY_LOCATION: UserSearchLocation = {
  id: null,
  user_id: null,
  address: '',
  latitude: null,
  longitude: null,
  cep: null,
};

interface UserSearchLocationContextType {
  location: UserSearchLocation;
  isLoading: boolean;
  status: UserSearchLocationStatus;
  source: UserSearchLocationSource;
  error: string | null;
  hasLocation: boolean;
  saveLocation: (addressData: GeocodedAddress, source?: 'manual' | 'gps') => Promise<{ error: string | null }>;
  refetch: () => void;
}

const UserSearchLocationContext = createContext<UserSearchLocationContextType | undefined>(undefined);

export const UserSearchLocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuthData();
  const [location, setLocation] = useState<UserSearchLocation>(EMPTY_LOCATION);
  const [status, setStatus] = useState<UserSearchLocationStatus>('loading');
  const [source, setSource] = useState<UserSearchLocationSource>('none');
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === 'loading';
  const hasLocation = status === 'ready'
    && location.latitude !== null
    && location.longitude !== null
    && location.address.trim().length > 0;

  const fetchLocation = useCallback(async (userId: string) => {
    setStatus('loading');
    setError(null);
    if (userId.startsWith('mock-')) {
      const saved = localStorage.getItem(`mock-search-location-${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as UserSearchLocation;
          if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number' && parsed.address) {
            setLocation(parsed);
            setSource('demo');
            setStatus('ready');
            return;
          }
        } catch (e) {
          console.error("Error parsing saved mock location:", e);
        }
      }
      setLocation({ ...EMPTY_LOCATION, user_id: userId });
      setSource('none');
      setStatus('missing');
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
        setSource('saved');
        setStatus('ready');
      } else {
        setLocation({ ...EMPTY_LOCATION, user_id: userId });
        setSource('none');
        setStatus('missing');
      }
    } catch (e) {
      console.error("Error fetching user search location:", e);
      const message = e instanceof Error ? e.message : 'Não foi possível carregar a localização.';
      setLocation({ ...EMPTY_LOCATION, user_id: userId });
      setSource('none');
      setError(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchLocation(user.id);
      } else {
        setLocation(EMPTY_LOCATION);
        setSource('none');
        setError(null);
        setStatus('missing');
      }
    }
  }, [user, authLoading, fetchLocation]);

  const saveLocation = useCallback(async (addressData: GeocodedAddress, nextSource: 'manual' | 'gps' = 'manual') => {
    if (!user) {
      showError("Usuário não autenticado.");
      return { error: "Usuário não autenticado." };
    }
    
    setStatus('loading');
    setError(null);
    
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
      setSource('demo');
      setStatus('ready');
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
      setSource(nextSource);
      setStatus('ready');
      return { error: null };
    } catch (e) {
      console.error("Error saving user search location:", e);
      const message = e instanceof Error ? e.message : 'Não foi possível salvar a localização.';
      setError(message);
      setStatus(location.latitude !== null && location.longitude !== null ? 'ready' : 'error');
      return { error: message };
    }
  }, [location.latitude, location.longitude, user]);

  const refetch = useCallback(() => {
    if (user) {
      fetchLocation(user.id);
    }
  }, [user, fetchLocation]);

  return (
    <UserSearchLocationContext.Provider value={{ location, isLoading, status, source, error, hasLocation, saveLocation, refetch }}>
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
